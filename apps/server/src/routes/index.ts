import { Router } from 'express';
import { conversationsRouter } from './conversations';
import { poolRouter } from './pool';
import { streamRouter } from './stream';
import { settingsRouter } from './settings';

const apiRouter = Router();

apiRouter.use('/conversations', conversationsRouter);
apiRouter.use('/', poolRouter); // pool/create, pool/:id, pools
apiRouter.use('/stream', streamRouter);
apiRouter.use('/settings', settingsRouter);

export { apiRouter };
