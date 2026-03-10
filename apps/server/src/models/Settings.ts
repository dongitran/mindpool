import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'node:crypto';
import { config } from '../config';

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

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  if (!config.encryptionKey) return null;
  return crypto.scryptSync(config.encryptionKey, 'mindpool-salt', 32);
}

function encrypt(text: string): string {
  if (!text) return text;
  const key = getEncryptionKey();
  if (!key) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(text: string): string {
  if (!text || !text.startsWith('enc:')) return text;
  const key = getEncryptionKey();
  if (!key) return text;

  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  const decrypted = decrypt(key);
  if (decrypted.length <= 8) return '••••••••';
  return decrypted.slice(0, 4) + '••••' + decrypted.slice(-4);
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

// Encrypt API keys before saving
SettingsSchema.pre('save', function () {
  const doc = this as SettingsDocument;
  const kimiKey = doc.apiKeys?.kimi;
  const minimaxKey = doc.apiKeys?.minimax;

  if (doc.isModified('apiKeys.kimi') && kimiKey && !kimiKey.startsWith('enc:')) {
    doc.apiKeys.kimi = encrypt(kimiKey);
  }
  if (doc.isModified('apiKeys.minimax') && minimaxKey && !minimaxKey.startsWith('enc:')) {
    doc.apiKeys.minimax = encrypt(minimaxKey);
  }
});

export const Settings = mongoose.model<SettingsDocument>('Settings', SettingsSchema);
