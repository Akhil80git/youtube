import {
  Baby,
  Compass,
  Film,
  Heart,
  Home,
  KeyRound,
  Moon,
  Music,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import type { AppTab, FollowedChannel, ThemeMode, ViewMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LaptopSidebarProps {
  appMode: 'videos' | 'music';
  activeView: ViewMode;
  likedCount: number;
  followedChannels: FollowedChannel[];
  activeChannelPath?: string;
  tabs: AppTab[];
  activeTabId: string;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  onSelectTab: (tab: AppTab) => void;
  onEditTab: (tab: AppTab) => void;
  onOpenKidsPassword: () => void;
  onCreateTab: () => void;
  onResetHome: () => void;
  onOpenFeed: () => void;
  onOpenFollowing: () => void;
  onOpenLiked: () => void;
  onChangeMode: (mode: 'videos' | 'music') => void;
  onOpenChannel: (path: string) => void;
}

export function LaptopSidebar({
  appMode,
  activeView,
  likedCount,
  followedChannels,
  activeChannelPath,
  tabs,
  activeTabId,
  theme,
  onChangeTheme,
  onSelectTab,
  onEditTab,
  onOpenKidsPassword,
  onCreateTab,
  onResetHome,
  onOpenFeed,
  onOpenFollowing,
  onOpenLiked,
  onChangeMode,
  onOpenChannel,
}: LaptopSidebarProps) {
  return (
    <aside
      aria-label="Desktop vertical navigation"
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60 xl:w-64 lg:flex-col lg:border-r lg:border-[#E5E3DD] lg:bg-white dark:lg:border-[#27272F] dark:lg:bg-[#141418]"
    >
      {/* Brand Mark */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#F2F0EC] px-5 dark:border-[#27272F]">
        <button
          type="button"
          onClick={onResetHome}
          className="font-display inline-flex cursor-pointer items-center gap-2 text-xl font-bold tracking-tight text-[#111111] transition-colors hover:text-[#E11D48] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48] dark:text-[#F4F4F6]"
        >
          <span className="inline-flex h-6 w-8 items-center justify-center rounded-md bg-[#E11D48] text-white">
            <Play className="h-3.5 w-3.5 translate-x-[0.5px] fill-current" />
          </span>
          <span>youtube</span>
        </button>

        {/* Compact Theme Toggle on Laptop Header */}
        <button
          type="button"
          onClick={() => onChangeTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
          title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] text-[#5C5A55] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#A1A1AA] dark:hover:text-white"
        >
          {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Mode Switcher: Videos (default) vs Music */}
      <div className="border-b border-[#F2F0EC] px-3 py-3 dark:border-[#27272F]">
        <div
          role="tablist"
          aria-label="Playback mode"
          className="grid grid-cols-2 gap-1 rounded-xl border border-[#E5E3DD] bg-[#FAF9F7] p-1 dark:border-[#27272F] dark:bg-[#1E1E24]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={appMode === 'videos'}
            onClick={() => onChangeMode('videos')}
            className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              appMode === 'videos'
                ? 'bg-white text-[#E11D48] shadow-xs dark:bg-[#27272F] dark:text-white'
                : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>Videos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={appMode === 'music'}
            onClick={() => onChangeMode('music')}
            className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              appMode === 'music'
                ? 'bg-[#E11D48] text-white shadow-xs'
                : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span>Music</span>
          </button>
        </div>
      </div>

      {/* Scrollable Sidebar Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Tabs / Spaces Section */}
        <div className="border-b border-[#F2F0EC] px-3 py-3 dark:border-[#27272F]">
          <div className="mb-1.5 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-[#73716C] dark:text-[#A1A1AA]">Tabs</span>
            <button
              type="button"
              onClick={onCreateTab}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#E11D48] hover:text-[#BE123C]"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </button>
          </div>
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const active = tab.id === activeTabId;
              const isKids = tab.kind === 'kids';
              return (
                <li key={tab.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectTab(tab)}
                    className={`flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#FFF1F3] font-semibold text-[#BE123C] dark:bg-[#E11D48]/20 dark:text-[#FB7185]'
                        : 'text-[#3D3C38] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#D4D4D8] dark:hover:bg-[#1E1E24] dark:hover:text-white'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {isKids && <Baby className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{tab.name}</span>
                    </span>
                    {isKids && tab.pin && (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                    )}
                  </button>

                  {isKids && (
                    <button
                      type="button"
                      onClick={onOpenKidsPassword}
                      aria-label="Kids screen password settings"
                      title={tab.pin ? 'Change Kids screen lock PIN' : 'Set Kids screen lock PIN'}
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#73716C] hover:bg-[#FAF9F7] hover:text-[#E11D48] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24]"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {tab.kind === 'custom' && (
                    <button
                      type="button"
                      onClick={() => onEditTab(tab)}
                      aria-label={`${tab.name} settings`}
                      title={`Rename or delete ${tab.name}`}
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#73716C] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Primary Vertical Nav Items */}
        <nav aria-label="Main sections" className="space-y-1 px-3 py-3">
          <button
            type="button"
            onClick={onResetHome}
            className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === 'explore'
                ? 'bg-[#FFF1F3] font-semibold text-[#BE123C] dark:bg-[#27272F] dark:text-white'
                : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white'
            }`}
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={onOpenFeed}
            className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === 'feed'
                ? 'bg-[#FFF1F3] font-semibold text-[#BE123C] dark:bg-[#27272F] dark:text-white'
                : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white'
            }`}
          >
            <Compass className="h-4 w-4 shrink-0" />
            <span>For You Feed</span>
          </button>

          <button
            type="button"
            onClick={onOpenFollowing}
            className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === 'following'
                ? 'bg-[#FFF1F3] font-semibold text-[#BE123C] dark:bg-[#27272F] dark:text-white'
                : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <Users className="h-4 w-4 shrink-0" />
              <span>Following</span>
            </span>
            {followedChannels.length > 0 && (
              <span
                className={`font-mono text-xs tabular-nums ${
                  activeView === 'following'
                    ? 'text-[#BE123C] dark:text-white/80'
                    : 'text-[#73716C] dark:text-[#A1A1AA]'
                }`}
              >
                {followedChannels.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenLiked}
            className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === 'liked'
                ? 'bg-[#E11D48] text-white'
                : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <Heart
                className={`h-4 w-4 shrink-0 ${
                  activeView === 'liked' || likedCount > 0 ? 'fill-current' : ''
                } ${activeView !== 'liked' && likedCount > 0 ? 'text-[#E11D48]' : ''}`}
              />
              <span>Liked Playlist</span>
            </span>
            {likedCount > 0 && (
              <span
                className={`font-mono text-xs tabular-nums ${
                  activeView === 'liked' ? 'text-white/90' : 'text-[#73716C] dark:text-[#A1A1AA]'
                }`}
              >
                {likedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Followed Channels Quick Access */}
        <div className="border-t border-[#F2F0EC] px-3 py-3 dark:border-[#27272F]">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-[#73716C] dark:text-[#A1A1AA]">
              Followed Channels
            </span>
            {followedChannels.length > 0 && (
              <button
                type="button"
                onClick={onOpenFollowing}
                className="cursor-pointer text-[11px] font-medium text-[#73716C] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white"
              >
                Manage
              </button>
            )}
          </div>

          {followedChannels.length === 0 ? (
            <p className="px-2 py-2 text-xs leading-relaxed text-[#73716C] dark:text-[#A1A1AA]">
              Follow channels to pin them here for 1-click access.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {followedChannels.map((ch) => {
                const isCurrent =
                  activeView === 'channel' && activeChannelPath === ch.path;
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => onOpenChannel(ch.path)}
                      className={`flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left text-xs transition-colors ${
                        isCurrent
                          ? 'bg-[#FFF1F3] font-semibold text-[#E11D48] dark:bg-[#1E1E24] dark:text-[#FB7185]'
                          : 'font-medium text-[#3D3C38] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#D4D4D8] dark:hover:bg-[#1E1E24] dark:hover:text-white'
                      }`}
                    >
                      {ch.avatar ? (
                        <img
                          src={ch.avatar}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-6 w-6 shrink-0 rounded-full bg-[#EAE7E1] object-cover dark:bg-[#27272F]"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFE4E8] font-display text-[10px] font-bold text-[#BE123C] dark:bg-[#27272F] dark:text-white">
                          {ch.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{ch.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom Install App CTA */}
      <div className="shrink-0 border-t border-[#F2F0EC] p-3 empty:hidden dark:border-[#27272F]">
        <PWAInstallButton variant="sidebar" />
      </div>
    </aside>
  );
}
