// backend/src/app.js

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import styleRoutes from "./routes/styles.routes.js";

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

//style register
app.use("/styles", styleRoutes);

//test route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;