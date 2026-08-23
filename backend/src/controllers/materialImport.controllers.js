// backend/src/controllers/materialImport.controllers.js
//
// Bulk-imports the legacy "Material Stock" Excel template into the
// current Material Receive / Item / Location schema.
//
// Confirmed header row (yours matches this exactly):
//   BUYER | DATE | INVOICE | SUP INVOICE | BOE | SEASON | PO NO |
//   STY NO | MODEL | ITEM | ITEM CODE | COLOR NAME | RCVD QTY |
//   RCVD ROLL | ISSUE YDS | ISSUE ROLL | INHAND QTY | INHAND ROLL |
//   RACK NO | REMARK | SUPLIER | ORIGIN | FABRIC DETAILS
//
// Mapping notes:
//   - STY NO   -> Style           (shown in the "Style / Model" column)
//   - MODEL    -> Model           (shown alongside Style, e.g. "332496 | 8645272")
//   - ITEM CODE -> Item Code/PDM  (the actual Item Code/PDM field used
//                                  everywhere else in the app)
//   - SUP INVOICE, BOE            -> not first-class fields in this
//                                     schema; folded into Remark so the
//                                     data is preserved instead of
//                                     silently dropped.
//
// IMPORT POLICY (per user request): NOTHING blocks an import. Every row
// in the sheet becomes a Material Receive and lands directly in stock,
// regardless of whether Item Code/PDM, Color, Rack No, or the Roll/Yds
// numbers are missing, blank, or wrong:
//   - Missing Item Code/PDM  -> defaults to "UNKNOWN"
//   - Missing Color          -> defaults to "UNKNOWN"
//   - Missing Rack No        -> defaults to "UNASSIGNED" (still a real
//                                rack allocation, so the row is visible
//                                in Material Stock immediately)
//   - Available Roll/Yds is ALWAYS set equal to Received Roll/Yds for
//                                every imported row. The sheet's Inhand
//                                columns are read but never used to
//                                compute Available -- they're frequently
//                                0/blank/inconsistent in the legacy
//                                file, and the goal is "everything
//                                received shows up in stock", not a
//                                perfectly accurate issued/available
//                                breakdown. Edit a row's real available
//                                quantity later on the Material Receive
//                                / Location Assignment pages if needed.
//   - No row is ever "invalid" and nothing is held back at commit time.
//
// Design decisions (confirmed with the user):
//   - Every spreadsheet ROW becomes its own independent Material Receive
//     (one Style, one Item Code/PDM + Color batch, one Rack allocation).
//     The legacy sheet is one-row-per-batch-per-rack and the same
//     Invoice No. is reused/duplicated/blank across many unrelated rows,
//     so grouping rows into a single parent Receive by Invoice would
//     silently merge unrelated stock. One row -> one Receive keeps every
//     row's data intact and independently editable/deletable afterwards.
//   - Every imported batch is inserted directly as "approved" (already
//     inspected + already racked), since this is historical/already-in-
//     the-warehouse stock, not a fresh receipt that needs Material
//     Inspection. passedRoll/passedYds = the received qty; rejected = 0.
//   - Warehouse is not present in the sheet -> defaults to "K-2" for
//     every imported row.
//   - Buyer: read from the BUYER column when present; if blank on a row,
//     falls back to "Decathlon - Woven" (the buyer on ~all legacy rows).
//
// Two-step flow (import happens over TWO separate requests):
//
//   1) POST /material-import  (multipart "file")
//      Preview-only -- parses the workbook and returns EVERY parsed row
//      as a record. Nothing is written to the DB. The frontend renders
//      `records` as an editable table so the user CAN tweak anything
//      before committing, but editing is entirely optional -- every row
//      commits successfully as-is.
//
//   2) POST /material-import/commit  (application/json)
//      Body: { records: [...] }  -- the records array from step 1,
//      optionally hand-edited. Does NOT re-read the original file.
//      Every record is inserted in a single transaction. Nothing is
//      rejected.
//
// Header matching is case/whitespace-insensitive and supports a few
// aliases per column. The header row itself is auto-detected (row 1 is
// often a stray title/merge artifact; the real headers are usually row
// 2), and every sheet in the workbook is scanned -- sheets that don't
// look like the stock template at all (no Item Code AND no Color column
// anywhere) are skipped automatically.

import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db, schema } from "../db/db.js";

const { materialReceives, materialReceiveStyles, materialReceiveItems, materialReceiveItemLocations, stockHistory } = schema;

const DEFAULT_WAREHOUSE = "K-2";
const DEFAULT_BUYER = "Decathlon - Woven";
const DEFAULT_ITEM_CODE = "UNKNOWN";
const DEFAULT_COLOR = "UNKNOWN";
const DEFAULT_LOCATION = "UNASSIGNED";
const DEFAULT_FABRIC_DETAILS = "N/A";

// Canonical field -> acceptable header names (normalized: upper case,
// trimmed, internal whitespace collapsed to a single space).
const HEADER_ALIASES = {
  buyer: ["BUYER"],
  date: ["DATE"],
  invoiceNo: ["INVOICE"],
  supInvoice: ["SUP INVOICE", "SUPPLIER INVOICE"],
  boe: ["BOE"],
  season: ["SEASON"],
  po: ["PO NO", "PO"],
  style: ["STY NO", "STYLE", "STY"],
  model: ["MODEL"],
  itemName: ["ITEM", "ITEM NAME"],
  itemCodePdm: ["ITEM CODE", "ITEM CODE/PDM", "PDM"],
  color: ["COLOR NAME", "COLOR"],
  rcvdYds: ["RCVD QTY", "QTY"],
  rcvdRoll: ["RCVD ROLL", "ROLL"],
  issueYds: ["ISSUE YDS"],
  issueRoll: ["ISSUE ROLL"],
  inhandYds: ["INHAND QTY"],
  inhandRoll: ["INHAND ROLL"],
  location: ["RACK NO", "RACK", "LOCATION"],
  supplier: ["SUPLIER", "SUPPLIER"],
  origin: ["ORIGIN"],
  remark: ["REMARK", "REMARKS"],
  fabricDetails: ["FABRIC DETAILS"],
};

function normalizeHeader(h) {
  return String(h ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

// Row 1 is frequently a stray title/merge artifact in these exports and
// the real column names sit on row 2 (occasionally row 1). Pick the
// first of the first few rows that has at least 5 non-empty cells.
function findHeaderRow(sheetRows) {
  for (let i = 0; i < Math.min(sheetRows.length, 5); i++) {
    const row = sheetRows[i] || [];
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "");
    if (nonEmpty.length >= 5) return i;
  }
  return 0;
}

function buildColumnMap(headerRow) {
  const normalized = headerRow.map(normalizeHeader);
  const map = {}; // canonical field -> column index
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) { map[field] = idx; break; }
    }
  }
  return map;
}

function excelDateToISO(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const d = XLSX.SSF?.parse_date_code ? XLSX.SSF.parse_date_code(value) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return null;
  }
  const s = String(value).trim();
  if (!s) return null;
  // Common "DD/MM/YY" / "D/M/YYYY" style dates seen in the legacy sheet.
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Handles "2-Jun-25" style text dates via the generic Date parser.
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function str(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

/**
 * Parses every sheet in the workbook and returns { records, warnings }.
 * `records` is the flat list of "one spreadsheet row = one future
 * Material Receive" objects. Every row is included -- nothing is ever
 * dropped or marked invalid. Missing Item Code/PDM, Color, or Rack No
 * are simply defaulted (see header comment) so the row still lands in
 * stock, and Available Roll/Yds is always set equal to Received
 * Roll/Yds regardless of what the sheet's Inhand columns say.
 * `warnings` is a short-form list noting which rows had a default
 * applied, purely informational -- never blocks preview or commit.
 */
function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const records = [];
  const warnings = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    if (!rows.length) continue;

    const headerIdx = findHeaderRow(rows);
    const headerRow = rows[headerIdx] || [];
    const colMap = buildColumnMap(headerRow);

    // Skip sheets that clearly aren't the stock template at all -- no
    // Item Code and no Color column anywhere on the header row.
    if (colMap.itemCodePdm === undefined && colMap.color === undefined) continue;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;

      const get = (field) => (colMap[field] !== undefined ? row[colMap[field]] : null);

      const rawItemCodePdm = str(get("itemCodePdm"));
      const rawColor = str(get("color"));
      const rawLocation = str(get("location"));

      const rollQty = num(get("rcvdRoll"));
      const yds = num(get("rcvdYds"));

      // ALWAYS available = received. Inhand columns are read but never
      // used to compute Available -- guarantees no row silently
      // disappears from Material Stock just because Inhand was
      // 0 / blank / wrong in the sheet.
      const availableRoll = rollQty;
      const availableYds = yds;

      const supplier = str(get("supplier"));
      const origin = str(get("origin"));
      const remarkRaw = str(get("remark"));
      const supInvoice = str(get("supInvoice"));
      const boe = str(get("boe"));

      // Fold SUP INVOICE / BOE / ORIGIN into Remark so nothing from the
      // sheet is silently lost, even though they aren't first-class
      // fields in this schema.
      const remark = [
        remarkRaw,
        supInvoice ? `Sup Invoice: ${supInvoice}` : "",
        boe ? `BOE: ${boe}` : "",
        origin ? `Origin: ${origin}` : "",
      ].filter(Boolean).join(" | ") || null;

      const defaultsApplied = [];
      if (!rawItemCodePdm) defaultsApplied.push("Item Code/PDM");
      if (!rawColor) defaultsApplied.push("Color");
      if (!rawLocation) defaultsApplied.push("Rack No");

      const rec = {
        _key: `${sheetName}-${r + 1}`,
        sheet: sheetName,
        row: r + 1,
        date: excelDateToISO(get("date")) || null,
        invoiceNo: str(get("invoiceNo")) || `IMPORTED-${sheetName}-${r + 1}`,
        buyer: str(get("buyer")) || DEFAULT_BUYER,
        supplier: supplier || null,
        season: str(get("season")) || "N/A",
        po: str(get("po")) || "N/A",
        item: str(get("itemName")) || rawItemCodePdm || DEFAULT_ITEM_CODE,
        remark,
        style: str(get("style")) || "N/A",
        model: str(get("model")) || null,
        itemCodePdm: rawItemCodePdm || DEFAULT_ITEM_CODE,
        color: rawColor || DEFAULT_COLOR,
        fabricDetails: str(get("fabricDetails")) || str(get("itemName")) || DEFAULT_FABRIC_DETAILS,
        rollQty,
        yds,
        location: rawLocation || DEFAULT_LOCATION,
        availableRoll,
        availableYds,
        // Purely informational -- never blocks preview or commit.
        defaultsApplied: defaultsApplied.length ? defaultsApplied : null,
      };

      if (defaultsApplied.length) {
        warnings.push({ sheet: sheetName, row: r + 1, defaultsApplied });
      }

      records.push(rec);
    }
  }

  return { records, warnings };
}

/**
 * Inserts a single record. Every record is treated as already-racked
 * ("approved"), since `location` always has a real value by this point
 * (a real rack from the sheet, or the "UNASSIGNED" fallback) -- nothing
 * is left in a not-yet-in-stock limbo.
 */
async function insertRecord(tx, rec) {
  const [inserted] = await tx.insert(materialReceives).values({
    date: rec.date || new Date().toISOString().slice(0, 10),
    invoiceNo: rec.invoiceNo,
    fromType: "Overseas",
    warehouse: DEFAULT_WAREHOUSE,
    buyer: rec.buyer,
    supplier: rec.supplier,
    season: rec.season,
    po: rec.po,
    item: rec.item,
    buy: null,
    remark: rec.remark,
    status: "approved",
  });
  const materialReceiveId = inserted.insertId;

  await tx.insert(materialReceiveStyles).values({
    materialReceiveId,
    style: rec.style,
    model: rec.model,
  });

  const passedRoll = num(rec.rollQty);
  const passedYds = num(rec.yds);

  await tx.insert(materialReceiveItems).values({
    materialReceiveId,
    itemCodePdm: rec.itemCodePdm,
    color: rec.color,
    fabricDetails: rec.fabricDetails,
    rollQty: passedRoll,
    yds: passedYds,
    passedRoll,
    passedYds,
    rejectedRoll: 0,
    rejectedYds: 0,
    unassignedRoll: 0,
    unassignedYds: 0,
    status: "approved",
    isRead: true,
    approvedAt: new Date(),
  });

  const [batch] = await tx
    .select()
    .from(materialReceiveItems)
    .where(eq(materialReceiveItems.materialReceiveId, materialReceiveId));

  await tx.insert(stockHistory).values({
    batchId: batch.id,
    allocationId: null,
    materialReceiveId,
    action: "receive",
    location: null,
    rollQty: passedRoll,
    yds: passedYds,
    note: `Imported from legacy spreadsheet (${rec.sheet ?? "edited"}, row ${rec.row ?? "n/a"})`,
  });

  // Always create a rack allocation -- location defaults to "UNASSIGNED"
  // when the sheet had no Rack No, so the row is still real stock and
  // shows up in Material Stock search immediately. Available always
  // mirrors Received (see parseWorkbook / commitMaterialStock).
  const [alloc] = await tx.insert(materialReceiveItemLocations).values({
    itemId: batch.id,
    materialReceiveId,
    location: rec.location,
    rollQty: passedRoll,
    yds: passedYds,
    availableRoll: num(rec.availableRoll),
    availableYds: num(rec.availableYds),
  });

  await tx.insert(stockHistory).values({
    batchId: batch.id,
    allocationId: alloc.insertId,
    materialReceiveId,
    action: "location_assignment",
    location: rec.location,
    rollQty: passedRoll,
    yds: passedYds,
    note: `Imported stock at ${rec.location}`,
  });
}

/**
 * POST /material-import
 * multipart/form-data, field "file" -- the .xlsx workbook.
 *
 * Preview only -- parses the workbook and returns EVERY parsed record
 * plus a purely-informational warnings list (which rows had a default
 * applied). Nothing is written to the DB. Use POST /material-import/commit
 * to actually insert -- every record there succeeds, none are rejected.
 */
export const importMaterialStock = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded (expected form field 'file')" });

    const { records, warnings } = parseWorkbook(req.file.buffer);

    if (!records.length) {
      return res.status(400).json({ message: "No usable rows found in this file", warnings });
    }

    return res.json({
      preview: true,
      totalRows: records.length,
      withDefaults: records.filter((r) => r.defaultsApplied).length,
      withoutRack: records.filter((r) => r.location === DEFAULT_LOCATION).length,
      warehouse: DEFAULT_WAREHOUSE,
      records,   // full list -- render as an editable table client-side (editing is optional)
      warnings,  // informational only, never blocks commit
    });
  } catch (error) {
    console.error("importMaterialStock error:", error);
    res.status(500).json({ message: "Failed to parse material stock file", detail: error.message });
  }
};

/**
 * POST /material-import/commit
 * application/json body: { records: [...] }
 *
 * `records` should be the array returned by the preview step above,
 * optionally hand-edited. Does NOT touch the original uploaded file.
 * Every record is inserted in one transaction -- nothing is rejected,
 * nothing needs to pass a validation check first.
 */
export const commitMaterialStock = async (req, res) => {
  try {
    const records = req.body?.records;
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ message: "No records provided to commit (expected { records: [...] })" });
    }

    let created = 0;
    await db.transaction(async (tx) => {
      for (const rec of records) {
        const rollQty = num(rec.rollQty);
        const yds = num(rec.yds);
        // Re-apply the same defaults here too, in case records were
        // constructed/edited client-side without going through preview.
        const safeRec = {
          ...rec,
          itemCodePdm: str(rec.itemCodePdm) || DEFAULT_ITEM_CODE,
          color: str(rec.color) || DEFAULT_COLOR,
          location: str(rec.location) || DEFAULT_LOCATION,
          fabricDetails: str(rec.fabricDetails) || DEFAULT_FABRIC_DETAILS,
          buyer: str(rec.buyer) || DEFAULT_BUYER,
          season: str(rec.season) || "N/A",
          po: str(rec.po) || "N/A",
          style: str(rec.style) || "N/A",
          invoiceNo: str(rec.invoiceNo) || `IMPORTED-${rec._key ?? Date.now()}`,
          item: str(rec.item) || str(rec.itemCodePdm) || DEFAULT_ITEM_CODE,
          rollQty,
          yds,
          // If the reviewer left Available blank/untouched, mirror it to
          // Received -- same "never silently zero" guarantee as preview.
          availableRoll: rec.availableRoll === "" || rec.availableRoll == null ? rollQty : num(rec.availableRoll),
          availableYds: rec.availableYds === "" || rec.availableYds == null ? yds : num(rec.availableYds),
        };
        await insertRecord(tx, safeRec);
        created += 1;
      }
    });

    res.status(201).json({
      committed: true,
      created,
      attempted: records.length,
      stillInvalid: [], // nothing is ever rejected
    });
  } catch (error) {
    console.error("commitMaterialStock error:", error);
    res.status(500).json({ message: "Failed to import material stock", detail: error.message });
  }
};