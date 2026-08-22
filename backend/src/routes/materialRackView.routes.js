// backend/src/routes/dashboard.routes.js

import { Router } from "express";
import { materialRackView } from "../controllers/materialRackView.controllers.js";

const router = Router();

// GET /material-rack-view
router.get("/", materialRackView);

export default router;