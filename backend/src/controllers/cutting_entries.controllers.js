// backend/src/controllers/cutting_entries.controllers.js
// Line-based cutting entries: per date, per line, size-wise quantities
// Multiple entries per line (same or different sizes/styles), fully editable

import { db } from "../db/db.js";
import { cutting_entries } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

function nowBD() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000);
}

// POST /cutting/entries
// Body: { factory, assigned_building, work_date, line, style, color, model, buyer, item, size_quantities, created_by }
// size_quantities: { "S": 120, "M": 200 }  (only the sizes user entered)
export async function createEntry(req, res) {
  try {
    const {
      factory, assigned_building,
      work_date, line,
      style, color, model, buyer, item,
      size_quantities,
      created_by,
    } = req.body;

    if (!factory || !assigned_building || !work_date || !line || !style || !color || !model || !buyer)
      return res.status(400).json({ message: "Missing required fields." });

    if (!size_quantities || typeof size_quantities !== "object" || Object.keys(size_quantities).length === 0)
      return res.status(400).json({ message: "At least one size quantity is required." });

    const total_pcs = Object.values(size_quantities).reduce((s, v) => s + Number(v || 0), 0);
    if (total_pcs === 0)
      return res.status(400).json({ message: "Total pcs cannot be zero." });

    const bd = nowBD();
    const [record] = await db.insert(cutting_entries).values({
      factory, assigned_building,
      work_date, line,
      style, color, model, buyer,
      item: item || null,
      size_quantities,
      total_pcs,
      created_by,
      createdAt: bd,
      updatedAt: bd,
    }).returning();

    return res.status(201).json({ message: "Entry created.", entry: record });
  } catch (err) {
    console.error("createEntry error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}

// GET /cutting/entries?factory=X&building=Y&date=YYYY-MM-DD
export async function getEntries(req, res) {
  try {
    const { factory, building, date } = req.query;
    if (!factory || !building || !date)
      return res.status(400).json({ message: "factory, building and date are required." });

    const entries = await db.select().from(cutting_entries)
      .where(and(
        eq(cutting_entries.factory, factory),
        eq(cutting_entries.assigned_building, building),
        eq(cutting_entries.work_date, date)
      ))
      .orderBy(cutting_entries.createdAt);

    return res.status(200).json({ entries });
  } catch (err) {
    console.error("getEntries error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}

// PUT /cutting/entries/:id
// Body: { factory, assigned_building, style, color, model, buyer, item, size_quantities }
export async function updateEntry(req, res) {
  try {
    const { id } = req.params;
    const {
      factory, assigned_building,
      style, color, model, buyer, item,
      size_quantities,
    } = req.body;

    if (!factory || !assigned_building)
      return res.status(400).json({ message: "factory and assigned_building are required." });

    if (!size_quantities || Object.keys(size_quantities).length === 0)
      return res.status(400).json({ message: "At least one size quantity is required." });

    const total_pcs = Object.values(size_quantities).reduce((s, v) => s + Number(v || 0), 0);

    const [updated] = await db.update(cutting_entries).set({
      style, color, model, buyer,
      item: item || null,
      size_quantities,
      total_pcs,
      updatedAt: nowBD(),
    }).where(and(
      eq(cutting_entries.id, Number(id)),
      eq(cutting_entries.factory, factory),
      eq(cutting_entries.assigned_building, assigned_building)
    )).returning();

    if (!updated) return res.status(404).json({ message: "Entry not found." });
    return res.status(200).json({ message: "Entry updated.", entry: updated });
  } catch (err) {
    console.error("updateEntry error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}

// DELETE /cutting/entries/:id
// Body: { factory, assigned_building }
export async function deleteEntry(req, res) {
  try {
    const { id } = req.params;
    const { factory, assigned_building } = req.body;

    if (!factory || !assigned_building)
      return res.status(400).json({ message: "factory and assigned_building are required." });

    const [deleted] = await db.delete(cutting_entries).where(and(
      eq(cutting_entries.id, Number(id)),
      eq(cutting_entries.factory, factory),
      eq(cutting_entries.assigned_building, assigned_building)
    )).returning();

    if (!deleted) return res.status(404).json({ message: "Entry not found." });
    return res.status(200).json({ message: "Entry deleted." });
  } catch (err) {
    console.error("deleteEntry error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}