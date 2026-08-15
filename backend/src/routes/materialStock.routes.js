// backend/src/routes/materialStock.routes.js

import { Router } from "express";
import { searchMaterialStock } from "../controllers/materialStock.controllers.js";

const router = Router();

router.get("/", searchMaterialStock);

export default router;