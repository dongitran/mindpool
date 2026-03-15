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
  const { setError, setScreen, navigateToMeeting, navigateToSetup } = useAppStore();
  const { data: convData, error: convError } = useConversations();
  const { data: poolData, error: poolsError } = usePools();
  const conversations = convData?.items ?? [];
  const pools = poolData?.items ?? [];

  useEffect(() => {
    if (convError || poolsError) {
      setError('Không thể tải dữ liệu server');
    }
  }, [convError, poolsError, setError]);

  // Restore screen from URL on mount + handle browser back/forward
  useEffect(() => {
    function handlePath(path: string) {
      const meetingMatch = path.match(/^\/meeting\/([a-f0-9]+)$/);
      const chatMatch = path.match(/^\/chat\/([a-f0-9]+)$/);
      if (meetingMatch) navigateToMeeting(meetingMatch[1]);
      else if (chatMatch) navigateToSetup(chatMatch[1]);
      else if (path === '/chat/new') navigateToSetup();
      else setScreen('welcome');
    }

    handlePath(window.location.pathname);

    const onPopState = () => handlePath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          meetings: pools
            .filter((p) => p.conversationId === c._id)
            .map((p) => ({
              _id: p._id,
              title: p.title,
              status: p.status,
              agents: p.agents || [],
            })),
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
