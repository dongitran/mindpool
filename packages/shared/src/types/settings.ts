export interface Settings {
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
    kimi?: string;
    minimax?: string;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  userId: 'default',
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
};
