// backend/src/routes/auth.routes.js

import { Router } from "express";
import { register, login, refresh, updateUser, changePassword } from "../controllers/auth.controllers.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.put("/update", updateUser);
router.put("/change-password", changePassword);

export default router;