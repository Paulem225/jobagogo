import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import jobsRouter from "./jobs";
import matchesRouter from "./matches";
import savedRouter from "./saved";
import premiumRouter from "./premium";
import cvsRouter from "./cvs";
import errorReportsRouter from "./errorReports";
import privacyRouter from "./privacy";
import authRouter from "./auth";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/admin", adminRouter);
router.use(profileRouter);
router.use(jobsRouter);
router.use(matchesRouter);
router.use(savedRouter);
router.use(premiumRouter);
router.use(cvsRouter);
router.use(errorReportsRouter);
router.use("/privacy", privacyRouter);

export default router;
