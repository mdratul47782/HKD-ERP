/**
 * migrate-decathlon-woven.js
 *
 * One-time migration: imports every row of the uploaded stock sheet
 * (decathlon_woven_data.json, already cleaned/extracted from
 * Material_Stock_Sheet.xlsx) into the live database as:
 *
 *   1. materialReceives      -- one per unique Invoice No.
 *   2. materialReceiveStyles -- distinct (Style, Model) pairs per invoice
 *   3. materialReceiveItems  -- ONE PER SHEET ROW (not aggregated), so the
 *                                original rack + date granularity is kept
 *                                exactly as in the sheet
 *   4. materialReceiveItemLocations -- one per sheet row, location = RACK NO
 *   5. stockHistory          -- a "receive" row for the full received qty,
 *                                plus an "issue" row if the sheet already
 *                                showed some of it issued (so History /
 *                                ledger reflects what really happened)
 *
 * Every batch is created ALREADY RACKED (status "approved",
 * unassignedRoll/Yds = 0) since the sheet already tells us the rack, and
 * availableRoll/Yds is set to INHAND QTY/ROLL (current stock), clamped to
 * a minimum of 0 (a few rows in the sheet have a negative Inhand due to
 * historical over-issue -- those are logged as-is in stock_history for
 * audit, but available stock itself can never go below 0).
 *
 * FIXED VALUES (confirmed with the user):
 *   buyer      = "Decathlon - Woven"
 *   warehouse  = "K-2"
 *   fromType   = "Local"
 *   buy        = ""   (left blank -- sheet has no equivalent column)
 *
 * IDEMPOTENT: every created Material Receive gets remark
 * "MIGRATED-STOCK-SHEET". Re-running the script skips any Invoice No.
 * that was already migrated, so it's safe to re-run after fixing an
 * error partway through.
 *
 * USAGE (run from inside your backend/ project root, where
 * src/db/db.js lives -- copy both this file and
 * decathlon_woven_data.json there first):
 *
 *   node migrate-decathlon-woven.js --dry-run     # preview only, no DB writes
 *   node migrate-decathlon-woven.js               # actually imports
 *
 * If your db module lives somewhere other than ./src/db/db.js relative
 * to this file, change DB_IMPORT_PATH below.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DB_IMPORT_PATH = "./src/db/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "decathlon_woven_data.json");

const DRY_RUN = process.argv.includes("--dry-run");

const FIXED = {
  buyer: "Decathlon - Woven",
  warehouse: "K-2",
  fromType: "Local",
  buy: "",
};

const MIGRATION_TAG = "MIGRATED-STOCK-SHEET";

function groupByInvoice(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.invoiceNo)) map.set(r.invoiceNo, []);
    map.get(r.invoiceNo).push(r);
  }
  return map;
}

function pickParentFields(group) {
  const dates = group.map((r) => r.date).filter(Boolean).sort();
  const date = dates[0] || group[0].date;

  const firstNonEmpty = (key, fallback) => {
    const found = group.find((r) => r[key] && r[key].trim());
    return found ? found[key].trim() : fallback;
  };

  return {
    date,
    invoiceNo: group[0].invoiceNo,
    season: firstNonEmpty("season", "N/A"),
    po: firstNonEmpty("po", "N/A"),
    item: firstNonEmpty("item", firstNonEmpty("fabric", "N/A")),
  };
}

function distinctStyles(group) {
  const seen = new Set();
  const out = [];
  for (const r of group) {
    if (!r.sty) continue;
    const key = `${r.sty}||${r.model || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ style: r.sty, model: r.model || null });
  }
  return out.length ? out : [{ style: "N/A", model: null }];
}

async function main() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const rows = JSON.parse(raw);
  const groups = groupByInvoice(rows);

  console.log(`Loaded ${rows.length} sheet rows across ${groups.size} invoices.`);
  if (DRY_RUN) console.log("*** DRY RUN -- no database writes will happen ***\n");

  let createdReceives = 0;
  let skippedReceives = 0;
  let createdItems = 0;
  let createdLocations = 0;
  let createdHistory = 0;
  const failedInvoices = [];

  if (DRY_RUN) {
    let previewShown = 0;
    for (const [invoiceNo, group] of groups) {
      const parent = pickParentFields(group);
      const styles = distinctStyles(group);

      if (previewShown < 3) {
        console.log("--- Sample invoice:", invoiceNo, "---");
        console.log("Parent:", { ...parent, ...FIXED });
        console.log("Styles:", styles);
        console.log(
          `Items (first 3 of ${group.length}):`,
          group.slice(0, 3).map((r) => ({
            itemCodePdm: r.itemCodePdm,
            color: r.color,
            rack: r.rack,
            rcvdRoll: r.rcvdRoll,
            rcvdQty: r.rcvdQty,
            issueRoll: r.issueRoll,
            issueYds: r.issueYds,
            inhandRoll: r.inhandRoll,
            inhandQty: r.inhandQty,
          }))
        );
        console.log("");
        previewShown++;
      }
      createdReceives++;
      createdItems += group.length;
      createdLocations += group.length;
      createdHistory += group.length + group.filter((r) => r.issueYds > 0 || r.issueRoll > 0).length;
    }

    console.log("=== DRY RUN SUMMARY ===");
    console.log("Material Receives to create:", createdReceives);
    console.log("Item/Color+Rack batches to create:", createdItems);
    console.log("Rack allocations to create:", createdLocations);
    console.log("Stock history rows to create:", createdHistory);
    return;
  }

  // ---- REAL RUN ----
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import(DB_IMPORT_PATH);
  const {
    materialReceives,
    materialReceiveStyles,
    materialReceiveItems,
    materialReceiveItemLocations,
    stockHistory,
  } = schema;

  let i = 0;
  for (const [invoiceNo, group] of groups) {
    i++;
    process.stdout.write(`[${i}/${groups.size}] ${invoiceNo} ... `);

    try {
      // idempotency: skip if this invoice was already migrated
      const already = await db
        .select()
        .from(materialReceives)
        .where(eq(materialReceives.invoiceNo, invoiceNo));
      if (already.some((r) => (r.remark || "").includes(MIGRATION_TAG))) {
        console.log("already migrated, skipped.");
        skippedReceives++;
        continue;
      }

      const parent = pickParentFields(group);
      const styles = distinctStyles(group);

      await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(materialReceives).values({
          date: parent.date,
          invoiceNo: parent.invoiceNo,
          fromType: FIXED.fromType,
          warehouse: FIXED.warehouse,
          buyer: FIXED.buyer,
          season: parent.season,
          po: parent.po,
          item: parent.item,
          buy: FIXED.buy,
          remark: MIGRATION_TAG,
          status: "approved",
        });
        const materialReceiveId = inserted.insertId;

        await tx.insert(materialReceiveStyles).values(
          styles.map((s) => ({ materialReceiveId, style: s.style, model: s.model }))
        );

        for (const row of group) {
          const rcvdRoll = Number(row.rcvdRoll) || 0;
          const rcvdYds = Number(row.rcvdQty) || 0;
          const availableRoll = Math.max(0, Number(row.inhandRoll) || 0);
          const availableYds = Math.max(0, Number(row.inhandQty) || 0);

          const [insertedItem] = await tx.insert(materialReceiveItems).values({
            materialReceiveId,
            itemCodePdm: row.itemCodePdm,
            color: row.color,
            rollQty: rcvdRoll,
            yds: rcvdYds,
            unassignedRoll: 0,
            unassignedYds: 0,
            status: "approved",
            approvedAt: new Date(),
          });
          const itemId = insertedItem.insertId;
          createdItems++;

          const [insertedAlloc] = await tx.insert(materialReceiveItemLocations).values({
            itemId,
            materialReceiveId,
            location: row.rack,
            rollQty: rcvdRoll,
            yds: rcvdYds,
            availableRoll,
            availableYds,
          });
          const allocationId = insertedAlloc.insertId;
          createdLocations++;

          await tx.insert(stockHistory).values({
            batchId: itemId,
            allocationId,
            materialReceiveId,
            action: "receive",
            location: row.rack,
            rollQty: rcvdRoll,
            yds: rcvdYds,
            note: `Migrated from legacy stock sheet (Invoice ${invoiceNo}, ${row.date})`,
          });
          createdHistory++;

          const issueRoll = Number(row.issueRoll) || 0;
          const issueYds = Number(row.issueYds) || 0;
          if (issueRoll > 0 || issueYds > 0) {
            await tx.insert(stockHistory).values({
              batchId: itemId,
              allocationId,
              materialReceiveId,
              action: "issue",
              location: row.rack,
              rollQty: issueRoll,
              yds: issueYds,
              note: `Migrated historical issue from legacy stock sheet (Invoice ${invoiceNo}, ${row.date})`,
            });
            createdHistory++;
          }
        }
      });

      createdReceives++;
      console.log("done.");
    } catch (err) {
      console.log("FAILED:", err.message);
      failedInvoices.push({ invoiceNo, error: err.message });
    }
  }

  console.log("\n=== MIGRATION SUMMARY ===");
  console.log("Material Receives created:", createdReceives);
  console.log("Material Receives skipped (already migrated):", skippedReceives);
  console.log("Item batches created:", createdItems);
  console.log("Rack allocations created:", createdLocations);
  console.log("Stock history rows created:", createdHistory);
  if (failedInvoices.length) {
    console.log("\nFAILED invoices:", failedInvoices.length);
    failedInvoices.forEach((f) => console.log(" -", f.invoiceNo, ":", f.error));
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});