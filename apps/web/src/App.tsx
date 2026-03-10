import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { MeetingScreen } from './screens/MeetingScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useConversations, usePools } from './hooks/useApiQueries';

function CurrentScreen() {
  const screen = useAppStore((s) => s.currentScreen);

  switch (screen) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'setup':
      return <SetupScreen />;
    case 'meeting':
      return <MeetingScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <WelcomeScreen />;
  }
}

function ErrorBanner() {
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  if (!error) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-red/15 border-b border-red/30 text-red text-sm">
      <span>{error}</span>
      <button
        onClick={clearError}
        className="ml-3 px-2 py-0.5 rounded text-xs hover:bg-red/20 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function App() {
  const { setError } = useAppStore();
  const { data: conversations = [], error: convError } = useConversations();
  const { data: pools = [], error: poolsError } = usePools();

  useEffect(() => {
    if (convError || poolsError) {
      setError('Không thể tải dữ liệu server');
    }
  }, [convError, poolsError, setError]);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-bg text-text">
      <Sidebar
        meetings={pools.map((p) => ({
          _id: p._id,
          title: p.title,
          status: p.status,
          agents: p.agents || [],
          duration: p.duration,
          updatedAt: p.updatedAt,
        }))}
        conversations={conversations.map((c) => ({
          _id: c._id,
          title: c.title,
          sub: c.sub || '',
          meetings: [],
        }))}
      />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <ErrorBanner />
        <ErrorBoundary>
          <CurrentScreen />
        </ErrorBoundary>
      </main>
    </div>
  );
}
