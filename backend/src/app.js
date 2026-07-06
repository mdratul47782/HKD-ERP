// backend/src/app.js

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cuttingRoutes from "./routes/cutting.routes.js";
import demoRoutes from "./routes/demo.routes.js";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ✅ Add limit here — this was the bug
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

//auth
app.use("/auth", authRoutes);

//cutting
app.use("/cutting", cuttingRoutes);

//demo
app.use("/demo", demoRoutes);

//test route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;