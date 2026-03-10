import { Pool, Agent, Message } from './models';
import { buildPoolService } from './services/pool.service';

export const poolService = buildPoolService({
    Pool,
    Agent,
    Message,
});
