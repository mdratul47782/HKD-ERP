// backend/src/routes/locationAssignment.routes.js

import { Router } from "express";
import { getPendingAssignments, assignLocation } from "../controllers/locationAssignment.controllers.js";

const router = Router();

router.get("/", getPendingAssignments);
router.patch("/:itemId", assignLocation);

export default router;

// Behind login: router.patch("/:itemId", authMiddleware, assignLocation);