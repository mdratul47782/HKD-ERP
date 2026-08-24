// backend/src/controllers/materialImport.controllers.js

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
  inhandYds: ["INHAND QTY", "STOCK QTY"],
  inhandRoll: ["INHAND ROLL", "STOCK ROLL"],
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Converts an Excel date serial number into { y, m, d } using pure
 * integer/UTC arithmetic -- no XLSX.SSF, no Date/timezone mixing.
 *
 * Excel's epoch is Dec 30 1899 (not Dec 31/Jan 1) because this also
 * absorbs Excel's famous fake-1900-leap-year bug (it treats 1900 as a
 * leap year, which it wasn't) -- Dec 30 1899 + serial days lands on the
 * same calendar date Excel itself displays, for every serial Excel
 * actually produces (>= 60). Everything here runs through Date.UTC /
 * getUTC* only, so the result can never drift with the server's local
 * timezone, regardless of what xlsx build or version is installed.
 */
function excelSerialToYMD(serial) {
  const epochUTC = Date.UTC(1899, 11, 30);
  const ms = epochUTC + Math.round(serial) * 86400000;
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/**
 * Converts a raw cell value (real Date, Excel serial number, or text
 * date) into a plain "YYYY-MM-DD" string, always matching the calendar
 * date the sheet actually shows -- never shifted by a server timezone.
 *
 * IMPORTANT: every branch below deliberately avoids mixing UTC output
 * (toISOString) with a value that was constructed/parsed in local time,
 * and vice versa -- that mismatch was the original off-by-one-day bug.
 * The numeric branch additionally avoids XLSX.SSF entirely, since that
 * turned out to be silently unavailable in this build (see the file
 * header "DATE HANDLING" comment) and was nulling out every date.
 */
function excelDateToISO(value) {
  if (value === null || value === undefined || value === "") return null;

  // 1) Defensive fallback only -- with cellDates left OFF (see file
  //    header comment), XLSX should no longer hand us Date instances for
  //    date-formatted cells at all; they arrive as raw serial numbers
  //    and go through branch (2) instead. If a Date object shows up
  //    anyway (e.g. a future code change), UTC getters are used since
  //    that's how XLSX itself would construct it.
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }

  // 2) Raw Excel serial number (date cell read without cellDates, or a
  //    numeric cell XLSX didn't auto-convert). Converted via pure
  //    integer/UTC math (excelSerialToYMD) -- no XLSX.SSF dependency,
  //    which is what silently nulled out every date in this file
  //    previously.
  if (typeof value === "number") {
    const { y, m, d } = excelSerialToYMD(value);
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  const s = String(value).trim();
  if (!s) return null;

  // 3) "DD/MM/YY" or "D/M/YYYY" -- common in the legacy sheet.
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // 4) Already-ISO text, e.g. "2025-06-02" (possibly with a time part) --
  //    take the date part as-is, no Date object involved.
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // 5) "D-MMM-YY" / "D-MMM-YYYY" / "D Mon YYYY" text dates, e.g.
  //    "2-Jun-25". Parsed explicitly against a month-name map instead
  //    of new Date(s), so there's no timezone ambiguity at all.
  const dmyText = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{2,4})$/);
  if (dmyText) {
    const [, d, monRaw, yRaw] = dmyText;
    const mon = MONTH_MAP[monRaw.toLowerCase().slice(0, 3)];
    if (mon) {
      const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
      return `${y}-${pad2(mon)}-${pad2(d)}`;
    }
  }

  // 6) Last-resort generic parse for anything else recognizable
  //    (e.g. "June 2, 2025"). new Date(s) interprets non-ISO strings in
  //    the SERVER's LOCAL timezone, so the result must be read back with
  //    LOCAL getters (not toISOString/UTC) to match how it was parsed --
  //    mixing the two is exactly what caused the original off-by-one-day
  //    bug.
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  }
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
 * dropped or marked invalid. Missing Item Code/PDM, Color, Rack No, or
 * an unparseable Date are simply defaulted (see header comment) so the
 * row still lands in stock. Received Roll/Yds comes from RCVD ROLL/
 * RCVD QTY and Available Roll/Yds comes from INHAND ROLL/INHAND QTY,
 * each pushed to DB exactly as the sheet has them. `warnings` is a
 * short-form list noting which rows had a default applied, purely
 * informational -- never blocks preview or commit.
 */
function parseWorkbook(buffer) {
  // cellDates intentionally OFF -- see the "DATE HANDLING" comment at
  // the top of this file. Real Excel date cells now come through as raw
  // serial numbers, which excelDateToISO() converts via pure integer/UTC
  // math (excelSerialToYMD), with no Date object, no XLSX.SSF dependency,
  // and therefore no timezone or missing-export issue anywhere in the
  // path.
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
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
      const rawDateCell = get("date");
      const parsedDate = excelDateToISO(rawDateCell);

      const rawInhandRoll = get("inhandRoll");
      const rawInhandYds = get("inhandYds");

      const rollQty = num(get("rcvdRoll"));
      const yds = num(get("rcvdYds"));

      // Available now comes straight from the sheet's INHAND ROLL /
      // INHAND QTY columns -- pushed to DB exactly as-is, never
      // substituted with Received. If the sheet's INHAND value is
      // wrong/blank, that same wrong/blank value is what lands in DB,
      // per the "exactly what's in the sheet" import policy. A blank
      // cell (column present but empty, or column missing entirely)
      // becomes 0 and is flagged below in defaultsApplied.
      const availableRoll = num(rawInhandRoll);
      const availableYds = num(rawInhandYds);

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
      // Flag rows where the Date cell was present but unparseable, or
      // simply blank -- previously this failed completely silently
      // (blank cell, no highlight, no Info icon). Now it gets the same
      // visibility as every other defaulted field.
      if (!parsedDate) defaultsApplied.push("Date");
      // Flag rows where INHAND ROLL / INHAND QTY was blank/missing in
      // the sheet, so a resulting Available = 0 is visible in the
      // review table instead of looking like silent data loss.
      if (str(rawInhandRoll) === "") defaultsApplied.push("Available Roll (INHAND ROLL blank)");
      if (str(rawInhandYds) === "") defaultsApplied.push("Available Qty (INHAND QTY blank)");

      const rec = {
        _key: `${sheetName}-${r + 1}`,
        sheet: sheetName,
        row: r + 1,
        date: parsedDate,
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
  // shows up in Material Stock search immediately. Available now comes
  // from the sheet's INHAND ROLL/QTY (see parseWorkbook / commit), not
  // mirrored from Received.
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
          // Available is pushed exactly as given (from INHAND ROLL/QTY
          // at preview time, or whatever the reviewer typed in the
          // table) -- no longer silently mirrored to Received.
          availableRoll: num(rec.availableRoll),
          availableYds: num(rec.availableYds),
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