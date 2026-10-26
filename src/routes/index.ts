import { Router } from "express";

import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import somitiRoutes from "../modules/somiti/somiti.route.js";
import memberRoutes from "../modules/member/member.route.js";
import loanRoutes from "../modules/loan/loan.route.js";
import collectionRoutes from "../modules/collection/collection.route.js";
import savingsRoutes from "../modules/savings/savings.route.js";
import dashboardRoutes from "../modules/dashboard/dashboard.route.js";
import reportRoutes from "../modules/reports/reports.route.js";
import { incomeExpenseRoutes } from "../modules/income-expense/income-expense.route.js";
import { settingsRoutes } from "../modules/settings/settings.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/somities", somitiRoutes);
router.use("/members", memberRoutes);
router.use("/loans", loanRoutes);
router.use("/collections", collectionRoutes);
router.use("/savings", savingsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/income-expense", incomeExpenseRoutes);
router.use("/settings", settingsRoutes);

export default router;
