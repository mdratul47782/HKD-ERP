// backend/src/routes/styles.routes.js

import { Router } from "express";
import {
  addRelease,
  createStyle,
  deleteRelease,
  deleteStyle,
  getAllStyles,
  getStyleById,
  toggleActive,
  updateRelease,
  updateStyle,
} from "../controllers/styles.controllers.js";

const router = Router();

router.post("/", createStyle);
router.get("/", getAllStyles);
router.get("/:id", getStyleById);
router.put("/:id", updateStyle);
router.patch("/:id/toggle-active", toggleActive);
router.post("/:id/release", addRelease);
router.put("/:id/release/:releaseId", updateRelease);
router.delete("/:id/release/:releaseId", deleteRelease);
router.delete("/:id", deleteStyle);

export default router;