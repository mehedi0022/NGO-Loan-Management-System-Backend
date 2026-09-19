import { Router } from "express";

import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import memberRoutes from "../modules/member/member.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/members", memberRoutes);

export default router;
