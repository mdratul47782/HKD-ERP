// backend/src/app.js

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import materialReceiveRoutes from "./routes/materialReceive.routes.js";
import locationAssignmentRoutes from "./routes/locationAssignment.routes.js";
import materialStockRoutes from "./routes/materialStock.routes.js";
import cuttingRequisitionRoutes from "./routes/cuttingRequisition.routes.js"; // ← new
import cuttingIssueRoutes from "./routes/cuttingIssue.routes.js"; // ← new
import materialInspectionRoutes from "./routes/materialInspection.routes.js"; // ← new
import materialRackView from "./routes/materialRackView.routes.js";
dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/auth", authRoutes);
app.use("/material-rack-view", materialRackView);
app.use("/material-inspection", materialInspectionRoutes); // ← new
app.use("/material-receive", materialReceiveRoutes);
app.use("/location-assignment", locationAssignmentRoutes);
app.use("/material-stock", materialStockRoutes);
app.use("/cutting-requisition", cuttingRequisitionRoutes); // ← new
app.use("/cutting-issue", cuttingIssueRoutes); // ← new

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;