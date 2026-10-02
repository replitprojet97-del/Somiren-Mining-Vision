import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import trackingRouter from "./tracking";
import workspaceRouter from "./workspace";
import collaboratorAuthRouter from "./collaboratorAuth";
import adminWorkspaceRouter from "./adminWorkspace";
import adminArrearsRouter from "./adminArrears";
import adminSalaryRouter from "./adminSalary";
import adminSenderServicesRouter from "./adminSenderServices";
import privateMediaRouter from "./privateMedia";
import workspaceMessageReadRouter from "./workspaceMessageRead";
import twoFactorRouter from "./twoFactor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);
router.use(trackingRouter);
router.use(collaboratorAuthRouter);
router.use(twoFactorRouter);
router.use(adminWorkspaceRouter);
router.use(adminArrearsRouter);
router.use(adminSalaryRouter);
router.use(adminSenderServicesRouter);
router.use(privateMediaRouter);
router.use(workspaceMessageReadRouter);
router.use(workspaceRouter);

export default router;
