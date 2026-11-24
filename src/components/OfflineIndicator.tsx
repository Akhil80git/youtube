import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-14 left-4 z-50 flex items-center gap-2 rounded-xl border border-[#E5E3DD] bg-white px-3.5 py-2 text-xs font-medium text-[#111111] shadow-lg lg:bottom-4 dark:border-[#27272F] dark:bg-[#141418] dark:text-white"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#E11D48]" />
      <span>Offline Mode — Showing cached app data</span>
    </div>
  );
}
