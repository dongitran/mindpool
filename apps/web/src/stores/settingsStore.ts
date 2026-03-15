import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsData {
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
}

interface SettingsState extends SettingsData {
  updateSetting: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
  setAll: (settings: Partial<SettingsData>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
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

      updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      setAll: (settings) => set(settings),
    }),
    {
      name: 'mindpool-settings',
      partialize: (state) => ({
        defaultModel: state.defaultModel,
        thinkingBudget: state.thinkingBudget,
        autoStartDiscussion: state.autoStartDiscussion,
        showThinkingDefault: state.showThinkingDefault,
        mindxEnabled: state.mindxEnabled,
        autoRecap: state.autoRecap,
        maxAgentsPerPool: state.maxAgentsPerPool,
        compactSidebar: state.compactSidebar,
        accentColor: state.accentColor,
      }),
    }
  )
);
