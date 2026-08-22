// backend/src/routes/buyerDashboard.routes.js
//
// Brand new, standalone route file for the "Buyer Overview" white
// dashboard. Does not touch any existing route file.
//
// TO WIRE THIS UP: in whichever file mounts your other routers
// (e.g. backend/src/app.js or backend/src/index.js, wherever you do
// something like `app.use("/dashboard", dashboardRoutes)` today for the
// existing dark dashboard), add ONE line:
//
//     import buyerDashboardRoutes from "./routes/buyerDashboard.routes.js";
//     app.use("/dashboard", buyerDashboardRoutes);
//
// That's it -- this file only ADDS the new GET /dashboard/buyer-overview
// path; it doesn't redefine or override GET /dashboard/material-overview
// (which stays wired to your existing dashboard.controllers.js exactly as
// it is today).

import { Router } from "express";
import { buyerOverview } from "../controllers/buyerDashboard.controllers.js";

const router = Router();

router.get("/buyer-overview", buyerOverview);

export default router;