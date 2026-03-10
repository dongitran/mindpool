import { Router } from 'express';
import { Settings, maskApiKey, encryptApiKey } from '../models';
import { validate } from '../middleware/validate';
import { updateSettingsSchema } from '@mindpool/shared';

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
    const update = { ...req.body };

    // Encrypt API keys before storing (findOneAndUpdate bypasses pre-save hooks)
    if (update.apiKeys) {
      if (update.apiKeys.kimi) {
        update.apiKeys.kimi = encryptApiKey(update.apiKeys.kimi);
      }
      if (update.apiKeys.minimax) {
        update.apiKeys.minimax = encryptApiKey(update.apiKeys.minimax);
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { userId: 'default' },
      { $set: update },
      { new: true, upsert: true }
    );

    // Mask API keys in response (same as GET)
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

export { router as settingsRouter };
