// backend/src/routes/cutting.routes.js

import express from "express";



// New line-entry controller
import {
  createEntry,
  getEntries,
  updateEntry,
  deleteEntry,
} from "../controllers/cutting_entries.controllers.js";

const router = express.Router();



// ── Line entry routes (new) ──
router.post("/entries",       createEntry);
router.get("/entries",        getEntries);
router.put("/entries/:id",    updateEntry);
router.delete("/entries/:id", deleteEntry);

export default router;