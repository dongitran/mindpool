import { create } from 'zustand';

export type Screen = 'welcome' | 'setup' | 'meeting' | 'history' | 'settings';

interface AppState {
  currentScreen: Screen;
  currentConversationId: string | null;
  currentMeetingId: string | null;
  initialSetupTopic: string | null;
  error: string | null;

  setScreen: (screen: Screen) => void;
  setCurrentConversation: (id: string | null) => void;
  setCurrentMeeting: (id: string | null) => void;
  navigateToMeeting: (meetingId: string) => void;
  navigateToSetup: (conversationId?: string) => void;
  setInitialSetupTopic: (topic: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'welcome',
  currentConversationId: null,
  currentMeetingId: null,
  initialSetupTopic: null,
  error: null,

  setScreen: (screen) => set({ currentScreen: screen }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setCurrentMeeting: (id) => set({ currentMeetingId: id }),
  navigateToMeeting: (meetingId) =>
    set({ currentScreen: 'meeting', currentMeetingId: meetingId }),
  navigateToSetup: (conversationId) =>
    set({ currentScreen: 'setup', currentConversationId: conversationId || null }),
  setInitialSetupTopic: (topic) => set({ initialSetupTopic: topic }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
