// backend/src/controllers/cutting_entries.controllers.js

import { eq, and } from "drizzle-orm";
import { db, schema, insertAndReturn, updateAndReturn, deleteAndReturn } from "../db/db.js";

const { cutting_entries } = schema;

function nowBD() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000);
}

// POST /cutting/entries
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

    const record = await insertAndReturn(cutting_entries, {
      factory, assigned_building,
      work_date, line,
      style, color, model, buyer,
      item: item || null,
      size_quantities,
      total_pcs,
      created_by,
      createdAt: bd,
      updatedAt: bd,
    });

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

    const whereClause = and(
      eq(cutting_entries.id, Number(id)),
      eq(cutting_entries.factory, factory),
      eq(cutting_entries.assigned_building, assigned_building)
    );

    const updated = await updateAndReturn(
      cutting_entries,
      {
        style, color, model, buyer,
        item: item || null,
        size_quantities,
        total_pcs,
        updatedAt: nowBD(),
      },
      whereClause
    );

    if (!updated) return res.status(404).json({ message: "Entry not found." });
    return res.status(200).json({ message: "Entry updated.", entry: updated });
  } catch (err) {
    console.error("updateEntry error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}

// DELETE /cutting/entries/:id
export async function deleteEntry(req, res) {
  try {
    const { id } = req.params;
    const { factory, assigned_building } = req.body;

    if (!factory || !assigned_building)
      return res.status(400).json({ message: "factory and assigned_building are required." });

    const whereClause = and(
      eq(cutting_entries.id, Number(id)),
      eq(cutting_entries.factory, factory),
      eq(cutting_entries.assigned_building, assigned_building)
    );

    const deleted = await deleteAndReturn(cutting_entries, whereClause);

    if (!deleted) return res.status(404).json({ message: "Entry not found." });
    return res.status(200).json({ message: "Entry deleted." });
  } catch (err) {
    console.error("deleteEntry error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
}