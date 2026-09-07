import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import trackingRouter from "./tracking";
import workspaceRouter from "./workspace";
import collaboratorAuthRouter from "./collaboratorAuth";
import adminWorkspaceRouter from "./adminWorkspace";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);
router.use(trackingRouter);
router.use(collaboratorAuthRouter);
router.use(adminWorkspaceRouter);
router.use(workspaceRouter);

export default router;
