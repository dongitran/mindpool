import { Router } from 'express';
import { Settings } from '../models';

const router = Router();

// GET /settings — get current settings (create default if not exists)
router.get('/', async (_req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: 'default' });

    if (!settings) {
      settings = await Settings.create({ userId: 'default' });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /settings — update settings
router.put('/', async (req, res, next) => {
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
