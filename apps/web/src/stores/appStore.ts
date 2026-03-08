import { create } from 'zustand';

export type Screen = 'welcome' | 'setup' | 'meeting' | 'history' | 'settings';

interface AppState {
  currentScreen: Screen;
  currentConversationId: string | null;
  currentMeetingId: string | null;
  conversations: any[];
  pools: any[];

  setScreen: (screen: Screen) => void;
  setCurrentConversation: (id: string | null) => void;
  setCurrentMeeting: (id: string | null) => void;
  setConversations: (conversations: any[]) => void;
  setPools: (pools: any[]) => void;
  navigateToMeeting: (meetingId: string) => void;
  navigateToSetup: (conversationId?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'welcome',
  currentConversationId: null,
  currentMeetingId: null,
  conversations: [],
  pools: [],

  setScreen: (screen) => set({ currentScreen: screen }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setCurrentMeeting: (id) => set({ currentMeetingId: id }),
  setConversations: (conversations) => set({ conversations }),
  setPools: (pools) => set({ pools }),
  navigateToMeeting: (meetingId) =>
    set({ currentScreen: 'meeting', currentMeetingId: meetingId }),
  navigateToSetup: (conversationId) =>
    set({ currentScreen: 'setup', currentConversationId: conversationId || null }),
}));
