import { create } from 'zustand';

interface SettingsState {
  defaultModel: string;
  thinkingBudget: number;
  autoStartDiscussion: boolean;
  showThinkingDefault: boolean;
  mindxEnabled: boolean;
  autoRecap: boolean;
  maxAgentsPerPool: number;
  compactSidebar: boolean;
  accentColor: string;
  apiKeys: { kimi?: string; minimax?: string };

  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  setAll: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultModel: 'kimi-k2',
  thinkingBudget: 10,
  autoStartDiscussion: true,
  showThinkingDefault: false,
  mindxEnabled: true,
  autoRecap: true,
  maxAgentsPerPool: 6,
  compactSidebar: false,
  accentColor: '#3dffc0',
  apiKeys: {},

  updateSetting: (key, value) => set({ [key]: value } as any),
  setAll: (settings) => set(settings),
}));
