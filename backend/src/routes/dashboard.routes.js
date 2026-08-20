// backend/src/routes/dashboard.routes.js

import { Router } from "express";
import { getMaterialOverview } from "../controllers/dashboard.controllers.js";

const router = Router();

// GET /dashboard/material-overview
router.get("/material-overview", getMaterialOverview);

export default router;