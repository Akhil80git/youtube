import { Compass, Film, Heart, Home, Music, Play, Users } from 'lucide-react';
import type { FollowedChannel } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LaptopSidebarProps {
  appMode: 'videos' | 'music';
  activeView: 'explore' | 'feed' | 'search' | 'channel' | 'following' | 'liked';
  likedCount: number;
  followedChannels: FollowedChannel[];
  activeChannelPath?: string;
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
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60 xl:w-64 lg:flex-col lg:border-r lg:border-[#E5E3DD] lg:bg-white"
    >
      {/* Brand Mark */}
      <div className="flex h-16 shrink-0 items-center border-b border-[#F2F0EC] px-5">
        <button
          type="button"
          onClick={onResetHome}
          className="font-display inline-flex cursor-pointer items-center gap-2 text-xl font-bold tracking-tight text-[#111111] transition-colors hover:text-[#E11D48] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
        >
          <span className="inline-flex h-6 w-8 items-center justify-center rounded-md bg-[#E11D48] text-white">
            <Play className="h-3.5 w-3.5 translate-x-[0.5px] fill-current" />
          </span>
          <span>youtube</span>
        </button>
      </div>

      {/* Mode Switcher: Videos (default) vs Music */}
      <div className="border-b border-[#F2F0EC] px-3 py-3">
        <div
          role="tablist"
          aria-label="Playback mode"
          className="grid grid-cols-2 gap-1 rounded-xl border border-[#E5E3DD] bg-[#F2F0EC] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={appMode === 'videos'}
            onClick={() => onChangeMode('videos')}
            className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              appMode === 'videos'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'text-[#5C5A55] hover:text-[#111111]'
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
                : 'text-[#5C5A55] hover:text-[#111111]'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span>Music</span>
          </button>
        </div>
      </div>

      {/* Primary Vertical Nav Items */}
      <nav aria-label="Main sections" className="space-y-1 px-3 py-3">
        <button
          type="button"
          onClick={onResetHome}
          className={`flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeView === 'explore'
              ? 'bg-[#111111] text-white'
              : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111]'
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
              ? 'bg-[#111111] text-white'
              : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111]'
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
              ? 'bg-[#111111] text-white'
              : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111]'
          }`}
        >
          <span className="flex items-center gap-3">
            <Users className="h-4 w-4 shrink-0" />
            <span>Following</span>
          </span>
          {followedChannels.length > 0 && (
            <span
              className={`font-mono text-xs tabular-nums ${
                activeView === 'following' ? 'text-white/80' : 'text-[#73716C]'
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
              : 'text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111]'
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
                activeView === 'liked' ? 'text-white/90' : 'text-[#73716C]'
              }`}
            >
              {likedCount}
            </span>
          )}
        </button>
      </nav>

      {/* Followed Channels Quick Access */}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#F2F0EC] px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-[#73716C]">Followed Channels</span>
          {followedChannels.length > 0 && (
            <button
              type="button"
              onClick={onOpenFollowing}
              className="cursor-pointer text-[11px] font-medium text-[#73716C] hover:text-[#111111]"
            >
              Manage
            </button>
          )}
        </div>

        {followedChannels.length === 0 ? (
          <p className="px-2 py-2 text-xs leading-relaxed text-[#73716C]">
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
                        ? 'bg-[#FAF9F7] font-semibold text-[#E11D48]'
                        : 'font-medium text-[#3D3C38] hover:bg-[#FAF9F7] hover:text-[#111111]'
                    }`}
                  >
                    {ch.avatar ? (
                      <img
                        src={ch.avatar}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-6 w-6 shrink-0 rounded-full bg-[#EAE7E1] object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111111] font-display text-[10px] font-bold text-white">
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

      {/* Bottom Install App CTA */}
      <div className="shrink-0 border-t border-[#F2F0EC] p-3 empty:hidden">
        <PWAInstallButton variant="sidebar" />
      </div>
    </aside>
  );
}
