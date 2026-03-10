import { Router } from 'express';
import { Settings, maskApiKey } from '../models';
import { validate } from '../middleware/validate';
import { updateSettingsSchema } from '../schemas/settings.schema';

const router = Router();

// GET /settings — get current settings (create default if not exists)
router.get('/', async (_req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: 'default' });

    if (!settings) {
      settings = await Settings.create({ userId: 'default' });
    }

    const obj = settings.toObject();
    obj.apiKeys = {
      kimi: maskApiKey(obj.apiKeys?.kimi ?? ''),
      minimax: maskApiKey(obj.apiKeys?.minimax ?? ''),
    };
    res.json(obj);
  } catch (error) {
    next(error);
  }
});

// PUT /settings — update settings (validated, whitelisted fields only)
router.put('/', validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: 'default' },
      { $set: req.body },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

export { router as settingsRouter };
