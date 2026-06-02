import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import serversRouter from "./servers";
import channelsRouter from "./channels";
import messagesRouter from "./messages";
import membersRouter from "./members";
import rolesRouter from "./roles";
import dmsRouter from "./dms";
import friendsRouter from "./friends";
import invitesRouter from "./invites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(serversRouter);
router.use(channelsRouter);
router.use(messagesRouter);
router.use(membersRouter);
router.use(rolesRouter);
router.use(dmsRouter);
router.use(friendsRouter);
router.use(invitesRouter);

export default router;
