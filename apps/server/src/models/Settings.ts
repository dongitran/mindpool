import mongoose, { Schema, Document } from 'mongoose';

export interface SettingsDocument extends Document {
  userId: string;
  defaultModel: string;
  thinkingBudget: number;
  autoStartDiscussion: boolean;
  showThinkingDefault: boolean;
  mindxEnabled: boolean;
  autoRecap: boolean;
  maxAgentsPerPool: number;
  compactSidebar: boolean;
  accentColor: string;
  apiKeys: {
    kimi: string;
    minimax: string;
  };
}

const SettingsSchema = new Schema({
  userId: { type: String, unique: true, default: 'default' },
  defaultModel: { type: String, default: 'kimi-k2' },
  thinkingBudget: { type: Number, default: 8000 },
  autoStartDiscussion: { type: Boolean, default: true },
  showThinkingDefault: { type: Boolean, default: false },
  mindxEnabled: { type: Boolean, default: true },
  autoRecap: { type: Boolean, default: true },
  maxAgentsPerPool: { type: Number, default: 6 },
  compactSidebar: { type: Boolean, default: false },
  accentColor: { type: String, default: '#6366f1' },
  apiKeys: {
    kimi: { type: String, default: '' },
    minimax: { type: String, default: '' },
  },
});

export const Settings = mongoose.model<SettingsDocument>('Settings', SettingsSchema);
