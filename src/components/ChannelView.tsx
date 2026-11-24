import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  Play,
  Search,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ChannelAbout,
  ChannelInfo,
  ChannelTab,
  MediaItem,
  PlaylistCard,
  PlaylistDetailResponse,
} from '../types';
import { DesktopSplitPlayer } from './DesktopSplitPlayer';
import { MediaCard, PlaylistCardItem } from './MediaCard';
import { MusicTrackRow } from './MusicTrackRow';

interface ChannelViewProps {
  appMode: 'videos' | 'music';
  isDesktop: boolean;
  isKidsTab?: boolean;
  channel: ChannelInfo;
  activeTab: ChannelTab;
  items: MediaItem[];
  playlists: PlaylistCard[];
  about: ChannelAbout | null;
  hasMore: boolean;
  loadingTab: boolean;
  loadingMore: boolean;
  loadingAll: boolean;
  playingItem: MediaItem | null;
  startSeconds: number;
  hasPrev: boolean;
  hasNext: boolean;
  hasExpandedPlayer: boolean;
  activePlaylist: PlaylistDetailResponse | null;
  loadingPlaylist: boolean;
  isFollowed: boolean;
  isLiked: (id: string) => boolean;
  onToggleFollow: (channel: ChannelInfo) => void;
  onToggleLike: (item: MediaItem) => void;
  onChangeTab: (tab: ChannelTab) => void;
  onLoadMore: () => void;
  onLoadAll: () => void;
  onStopLoadAll: () => void;
  onPlayItem: (item: MediaItem, customQueue?: MediaItem[], queueLabel?: string) => void;
  onStopPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnded: () => void;
  onExpandFull: (
    item: MediaItem,
    initialRotation: 0 | 90 | 180 | 270,
    startSeconds?: number,
    lockOnOpen?: boolean
  ) => void;
  onOpenPlaylist: (playlist: PlaylistCard) => void;
  onClosePlaylist: () => void;
}

const TAB_LABELS: Record<ChannelTab, string> = {
  videos: 'Videos',
  shorts: 'Shorts',
  live: 'Live',
  playlists: 'Playlists',
  about: 'About',
};

function parseViewNumber(text: string): number {
  const clean = text.toUpperCase().replace(/,/g, '').replace(/\s*VIEWS?/g, '').trim();
  const match = clean.match(/^([\d.]+)\s*([KMB])?$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === 'B') return num * 1_000_000_000;
  if (suffix === 'M') return num * 1_000_000;
  if (suffix === 'K') return num * 1_000;
  return num;
}

export function ChannelView({
  appMode,
  isDesktop,
  isKidsTab = false,
  channel,
  activeTab,
  items,
  playlists,
  about,
  hasMore,
  loadingTab,
  loadingMore,
  loadingAll,
  playingItem,
  startSeconds,
  hasPrev,
  hasNext,
  hasExpandedPlayer,
  activePlaylist,
  loadingPlaylist,
  isFollowed,
  isLiked,
  onToggleFollow,
  onToggleLike,
  onChangeTab,
  onLoadMore,
  onLoadAll,
  onStopLoadAll,
  onPlayItem,
  onStopPlay,
  onPrev,
  onNext,
  onEnded,
  onExpandFull,
  onOpenPlaylist,
  onClosePlaylist,
}: ChannelViewProps) {
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [bannerError, setBannerError] = useState(false);

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    let list = q
      ? items.filter((item) => item.title.toLowerCase().includes(q))
      : items;

    if (sortBy === 'popular') {
      list = [...list].sort((a, b) => parseViewNumber(b.viewsText) - parseViewNumber(a.viewsText));
    }
    return list;
  }, [items, filterText, sortBy]);

  const filteredPlaylists = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return q ? playlists.filter((p) => p.title.toLowerCase().includes(q)) : playlists;
  }, [playlists, filterText]);

  const splitPlaylistActive =
    isDesktop &&
    appMode === 'videos' &&
    Boolean(playingItem) &&
    !hasExpandedPlayer &&
    Boolean(activePlaylist);

  const splitTabActive =
    isDesktop &&
    appMode === 'videos' &&
    Boolean(playingItem) &&
    !hasExpandedPlayer &&
    !activePlaylist &&
    activeTab !== 'playlists' &&
    activeTab !== 'about';

  return (
    <main className="mx-auto max-w-[1440px] px-3 pb-36 pt-4 sm:px-6 sm:pt-6 lg:pb-24">
      {channel.banner && !bannerError && (
        <div className="mb-4 aspect-[4/1] w-full overflow-hidden rounded-xl bg-[#EAE7E1] sm:mb-6 sm:aspect-[6/1] sm:rounded-2xl dark:bg-[#1E1E24]">
          <img
            src={channel.banner}
            alt={`${channel.title} banner`}
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-[#E5E3DD] pb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-6 dark:border-[#27272F]">
        <div className="flex items-center gap-3.5 sm:gap-5">
          {channel.avatar ? (
            <img
              src={channel.avatar}
              alt={channel.title}
              referrerPolicy="no-referrer"
              className="h-14 w-14 shrink-0 rounded-full border border-[#E5E3DD] bg-[#EAE7E1] object-cover sm:h-20 sm:w-20 dark:border-[#27272F] dark:bg-[#1E1E24]"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFE4E8] font-display text-xl font-bold text-[#BE123C] sm:h-20 sm:w-20 sm:text-2xl dark:bg-[#27272F] dark:text-white">
              {channel.title.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold tracking-tight text-[#111111] sm:text-3xl dark:text-[#F4F4F6]">
              {channel.title}
            </h1>
            <p className="mt-1 truncate text-xs tabular-nums text-[#5C5A55] sm:text-sm dark:text-[#A1A1AA]">
              {[channel.handle, channel.subscribersText, channel.videoCountText]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {channel.description && (
              <p className="mt-1.5 line-clamp-1 max-w-2xl text-xs text-[#73716C] dark:text-[#A1A1AA]">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onToggleFollow(channel)}
            aria-pressed={isFollowed}
            className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors sm:h-10 sm:flex-initial whitespace-nowrap ${
              isFollowed
                ? 'border-[#E11D48] bg-[#FFF1F3] text-[#BE123C] hover:bg-[#FFE4E8] dark:border-[#E11D48] dark:bg-[#E11D48]/20 dark:text-[#FB7185]'
                : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6]'
            }`}
          >
            {isFollowed ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span>{isFollowed ? 'Following' : 'Follow'}</span>
          </button>

          {items.length > 0 && activeTab !== 'playlists' && activeTab !== 'about' && (
            <button
              type="button"
              onClick={() => onPlayItem(items[0])}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] sm:h-10 sm:flex-initial whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play Latest</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs + In-Channel Filter Row */}
      <div className="mt-4 flex flex-col gap-3 border-b border-[#E5E3DD] pb-4 md:flex-row md:items-center md:justify-between dark:border-[#27272F]">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {channel.availableTabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setFilterText('');
                  onChangeTab(tab);
                }}
                className={`min-h-[40px] cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#E11D48] text-white'
                    : 'text-[#5C5A55] hover:bg-[#F2F0EC] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {activeTab !== 'about' && !activePlaylist && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
            <div className="relative flex-1 sm:w-56 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#73716C] dark:text-[#A1A1AA]" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={`Filter ${TAB_LABELS[activeTab].toLowerCase()}...`}
                className="h-10 w-full rounded-lg border border-[#E5E3DD] bg-white pl-8 pr-3 text-xs text-[#111111] placeholder:text-[#73716C] focus:border-[#E11D48] focus:outline-none sm:h-9 dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6] dark:placeholder:text-[#71717A]"
              />
            </div>

            {activeTab !== 'playlists' && (
              <div className="flex self-start rounded-lg bg-[#F2F0EC] p-0.5 text-xs sm:self-auto dark:bg-[#1E1E24]">
                <button
                  type="button"
                  onClick={() => setSortBy('latest')}
                  className={`min-h-[34px] cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors whitespace-nowrap ${
                    sortBy === 'latest'
                      ? 'bg-white text-[#E11D48] shadow-xs dark:bg-[#27272F] dark:text-white'
                      : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
                  }`}
                >
                  Latest
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('popular')}
                  className={`min-h-[34px] cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors whitespace-nowrap ${
                    sortBy === 'popular'
                      ? 'bg-white text-[#E11D48] shadow-xs dark:bg-[#27272F] dark:text-white'
                      : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
                  }`}
                >
                  Most Viewed
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      {loadingTab ? (
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2.5">
              <div className="aspect-video w-full rounded-xl bg-[#EAE7E1] dark:bg-[#1E1E24]" />
              <div className="h-4 w-5/6 rounded bg-[#EAE7E1] dark:bg-[#1E1E24]" />
              <div className="h-3 w-1/2 rounded bg-[#EAE7E1] dark:bg-[#1E1E24]" />
            </div>
          ))}
        </div>
      ) : activeTab === 'about' ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-6 lg:col-span-8">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#111111] dark:text-[#F4F4F6]">
                Description
              </h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#3D3C38] dark:text-[#D4D4D8]">
                {about?.description || channel.description || 'No description provided.'}
              </p>
            </div>

            {about && about.links.length > 0 && (
              <div className="border-t border-[#E5E3DD] pt-6 dark:border-[#27272F]">
                <h2 className="font-display text-lg font-semibold text-[#111111] dark:text-[#F4F4F6]">
                  Links
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {about.links.map((link, idx) => (
                    <a
                      key={`${link.url}-${idx}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] items-center justify-between rounded-xl border border-[#E5E3DD] bg-white px-4 py-3 text-sm transition-colors hover:border-[#E11D48] dark:border-[#27272F] dark:bg-[#141418]"
                    >
                      <span className="truncate font-medium text-[#111111] dark:text-[#F4F4F6]">
                        {link.title}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#73716C] dark:text-[#A1A1AA]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-2xl border border-[#E5E3DD] bg-white p-5 sm:p-6 lg:col-span-4 lg:self-start dark:border-[#27272F] dark:bg-[#141418]">
            <h2 className="font-display text-lg font-semibold text-[#111111] dark:text-[#F4F4F6]">
              Channel Details
            </h2>
            <dl className="divide-y divide-[#F2F0EC] text-sm dark:divide-[#27272F]">
              {about?.subscriberCountText && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5C5A55] dark:text-[#A1A1AA]">Subscribers</dt>
                  <dd className="font-medium tabular-nums text-[#111111] dark:text-[#F4F4F6]">
                    {about.subscriberCountText}
                  </dd>
                </div>
              )}
              {about?.videoCountText && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5C5A55] dark:text-[#A1A1AA]">Total Videos</dt>
                  <dd className="font-medium tabular-nums text-[#111111] dark:text-[#F4F4F6]">
                    {about.videoCountText}
                  </dd>
                </div>
              )}
              {about?.viewCountText && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5C5A55] dark:text-[#A1A1AA]">Total Views</dt>
                  <dd className="font-medium tabular-nums text-[#111111] dark:text-[#F4F4F6]">
                    {about.viewCountText}
                  </dd>
                </div>
              )}
              {about?.joinedDateText && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5C5A55] dark:text-[#A1A1AA]">Joined</dt>
                  <dd className="font-medium text-[#111111] dark:text-[#F4F4F6]">
                    {about.joinedDateText}
                  </dd>
                </div>
              )}
              {about?.country && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-[#5C5A55] dark:text-[#A1A1AA]">Location</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-[#111111] dark:text-[#F4F4F6]">
                    <Globe className="h-3.5 w-3.5 text-[#73716C] dark:text-[#A1A1AA]" />
                    <span>{about.country}</span>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      ) : activeTab === 'playlists' ? (
        loadingPlaylist ? (
          <div className="mt-10 flex items-center justify-center py-12 text-sm text-[#5C5A55] dark:text-[#A1A1AA]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Loading playlist videos...</span>
          </div>
        ) : activePlaylist ? (
          <div className="mt-6">
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#E5E3DD] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-[#27272F] dark:bg-[#141418]">
              <div>
                <button
                  type="button"
                  onClick={onClosePlaylist}
                  className="mb-2 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 text-xs font-medium text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All Playlists</span>
                </button>
                <h2 className="font-display text-xl font-bold text-[#111111] dark:text-[#F4F4F6]">
                  {activePlaylist.title}
                </h2>
                <p className="mt-1 text-xs tabular-nums text-[#5C5A55] dark:text-[#A1A1AA]">
                  {[activePlaylist.author, activePlaylist.videoCountText, activePlaylist.viewsText]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {activePlaylist.videos.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onPlayItem(
                      activePlaylist.videos[0],
                      activePlaylist.videos,
                      activePlaylist.title
                    )
                  }
                  className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] sm:h-10 sm:w-auto whitespace-nowrap"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Play All</span>
                </button>
              )}
            </div>

            {appMode === 'music' ? (
              <div className="space-y-2">
                {activePlaylist.videos.map((vid, idx) => (
                  <MusicTrackRow
                    key={vid.id}
                    item={vid}
                    index={idx}
                    isPlaying={playingItem?.id === vid.id}
                    isLiked={isLiked(vid.id)}
                    onPlay={(item) =>
                      onPlayItem(item, activePlaylist.videos, activePlaylist.title)
                    }
                    onToggleLike={onToggleLike}
                  />
                ))}
              </div>
            ) : (
              <>
                {splitPlaylistActive && playingItem && (
                  <DesktopSplitPlayer
                    playingItem={playingItem}
                    queue={activePlaylist.videos}
                    queueTitle={activePlaylist.title}
                    startSeconds={startSeconds}
                    hasPrev={hasPrev}
                    hasNext={hasNext}
                    isKidsTab={isKidsTab}
                    isLiked={isLiked}
                    onSelectVideo={(vid) =>
                      onPlayItem(vid, activePlaylist.videos, activePlaylist.title)
                    }
                    onPrev={onPrev}
                    onNext={onNext}
                    onEnded={onEnded}
                    onToggleLike={onToggleLike}
                    onOpenFull={(sec) => onExpandFull(playingItem, 0, sec)}
                    onLockKidsScreen={(sec) => onExpandFull(playingItem, 0, sec, true)}
                    onClose={onStopPlay}
                  />
                )}

                {!splitPlaylistActive && (
                  <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {activePlaylist.videos.map((vid) => (
                      <MediaCard
                        key={vid.id}
                        item={vid}
                        isPlaying={playingItem?.id === vid.id}
                        suppressInlineFrame={hasExpandedPlayer || isDesktop}
                        isKidsTab={isKidsTab}
                        isLiked={isLiked(vid.id)}
                        onPlay={(item) =>
                          onPlayItem(item, activePlaylist.videos, activePlaylist.title)
                        }
                        onStopPlay={onStopPlay}
                        onEnded={onEnded}
                        onExpandFull={onExpandFull}
                        onToggleLike={onToggleLike}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#5C5A55] dark:text-[#A1A1AA]">
            No playlists found on this channel.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlaylists.map((pl) => (
              <PlaylistCardItem key={pl.id} playlist={pl} onSelect={onOpenPlaylist} />
            ))}
          </div>
        )
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#5C5A55] dark:text-[#A1A1AA]">
          {filterText
            ? `No ${TAB_LABELS[activeTab].toLowerCase()} matching "${filterText}".`
            : `No ${TAB_LABELS[activeTab].toLowerCase()} available on this channel.`}
        </div>
      ) : (
        <>
          {appMode === 'music' ? (
            <div className="mt-6 space-y-2">
              {filteredItems.map((item, idx) => (
                <MusicTrackRow
                  key={item.id}
                  item={item}
                  index={idx}
                  isPlaying={playingItem?.id === item.id}
                  isLiked={isLiked(item.id)}
                  onPlay={(clicked) => onPlayItem(clicked)}
                  onToggleLike={onToggleLike}
                />
              ))}
            </div>
          ) : splitTabActive && playingItem ? (
            <div className="mt-6">
              <DesktopSplitPlayer
                playingItem={playingItem}
                queue={filteredItems}
                queueTitle={`${channel.title} · ${TAB_LABELS[activeTab]}`}
                startSeconds={startSeconds}
                hasPrev={hasPrev}
                hasNext={hasNext}
                isKidsTab={isKidsTab}
                isLiked={isLiked}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={onLoadMore}
                onSelectVideo={(clicked) => onPlayItem(clicked, filteredItems)}
                onPrev={onPrev}
                onNext={onNext}
                onEnded={onEnded}
                onToggleLike={onToggleLike}
                onOpenFull={(sec) => onExpandFull(playingItem, 0, sec)}
                onLockKidsScreen={(sec) => onExpandFull(playingItem, 0, sec, true)}
                onClose={onStopPlay}
              />
            </div>
          ) : (
            <div
              className={`mt-6 grid gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8 ${
                activeTab === 'shorts'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}
            >
              {filteredItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  isPlaying={playingItem?.id === item.id}
                  suppressInlineFrame={hasExpandedPlayer || isDesktop}
                  isKidsTab={isKidsTab}
                  isLiked={isLiked(item.id)}
                  onPlay={(clicked) => onPlayItem(clicked, filteredItems)}
                  onStopPlay={onStopPlay}
                  onEnded={onEnded}
                  onExpandFull={onExpandFull}
                  onToggleLike={onToggleLike}
                />
              ))}
            </div>
          )}

          {/* Pagination Footer */}
          <div
            className={`mt-10 flex flex-col gap-4 border-t border-[#E5E3DD] pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#27272F] ${
              splitTabActive ? 'lg:hidden' : ''
            }`}
          >
            <p className="text-xs tabular-nums text-[#5C5A55] dark:text-[#A1A1AA]">
              Showing {filteredItems.length} of {items.length} loaded{' '}
              {TAB_LABELS[activeTab].toLowerCase()}
              {hasMore ? ' (more available)' : ''}
            </p>

            {hasMore && (
              <div className="flex flex-wrap items-center gap-2.5">
                {loadingAll ? (
                  <button
                    type="button"
                    onClick={onStopLoadAll}
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E5E3DD] bg-white px-4 text-sm font-medium text-[#111111] hover:border-[#E11D48] sm:h-10 sm:w-auto dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6]"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-[#E11D48]" />
                    <span>Loading all... (Stop)</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={onLoadMore}
                      className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] disabled:opacity-50 sm:h-10 sm:flex-initial"
                    >
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>{loadingMore ? 'Loading...' : 'Load More'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={onLoadAll}
                      className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-white px-4 text-sm font-medium text-[#111111] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] disabled:opacity-50 sm:h-10 sm:flex-initial dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6]"
                    >
                      Load All
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
