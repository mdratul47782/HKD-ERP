// backend/src/app.js

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import materialReceiveRoutes from "./routes/materialReceive.routes.js";
import locationAssignmentRoutes from "./routes/locationAssignment.routes.js"; // ← new
import materialStockRoutes from "./routes/materialStock.routes.js"; // ← new

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/auth", authRoutes);
app.use("/material-receive", materialReceiveRoutes);
app.use("/location-assignment", locationAssignmentRoutes); // ← new
app.use("/material-stock", materialStockRoutes); // ← new

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;