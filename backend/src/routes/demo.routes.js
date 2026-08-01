// backend/src/routes/demo.routes.js

import { Router } from "express";
import { createPayloadTest, getPayloadTests } from "../controllers/demo.controllers.js";

const router = Router();

router.get("/payloads", getPayloadTests);
router.post("/payloads", createPayloadTest);

export default router;