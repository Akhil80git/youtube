import { Compass, Loader2, Play, RefreshCw } from 'lucide-react';
import type { MediaItem } from '../types';
import { DesktopSplitPlayer } from './DesktopSplitPlayer';
import { MediaCard } from './MediaCard';
import { MusicTrackRow } from './MusicTrackRow';

interface FeedViewProps {
  appMode: 'videos' | 'music';
  isDesktop: boolean;
  isKidsTab?: boolean;
  activeTabName?: string;
  items: MediaItem[];
  seeds: string[];
  activeSeed: string | null;
  personalized: boolean;
  loading: boolean;
  error: string | null;
  playingItem: MediaItem | null;
  startSeconds: number;
  hasPrev: boolean;
  hasNext: boolean;
  hasExpandedPlayer: boolean;
  isLiked: (id: string) => boolean;
  onSelectSeed: (seed: string | null) => void;
  onRefresh: () => void;
  onPlayItem: (item: MediaItem, queue: MediaItem[]) => void;
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
  onToggleLike: (item: MediaItem) => void;
  onOpenChannel: (path: string) => void;
}

export function FeedView({
  appMode,
  isDesktop,
  isKidsTab = false,
  activeTabName,
  items,
  seeds,
  activeSeed,
  personalized,
  loading,
  error,
  playingItem,
  startSeconds,
  hasPrev,
  hasNext,
  hasExpandedPlayer,
  isLiked,
  onSelectSeed,
  onRefresh,
  onPlayItem,
  onStopPlay,
  onPrev,
  onNext,
  onEnded,
  onExpandFull,
  onToggleLike,
  onOpenChannel,
}: FeedViewProps) {
  const splitActive =
    isDesktop && appMode === 'videos' && Boolean(playingItem) && !hasExpandedPlayer;

  return (
    <main className="mx-auto max-w-[1440px] px-3 pb-36 pt-5 sm:px-6 sm:pt-6 lg:pb-24">
      <div className="flex flex-col gap-4 border-b border-[#E5E3DD] pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-[#27272F]">
        <div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl dark:text-[#F4F4F6]">
            {activeTabName && activeTabName !== 'Main'
              ? `${activeTabName} Feed`
              : 'For You Feed'}
          </h1>
          <p className="mt-1 text-sm text-[#5C5A55] dark:text-[#A1A1AA]">
            {isKidsTab
              ? 'Safe kids mix · Tap Rotate on any video to lock screen touches with your Kids PIN'
              : personalized
                ? 'Songs and videos picked across all channels from what you watch and like'
                : 'Popular mixes across YouTube · Watch or like videos to tailor this tab feed'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#E5E3DD] bg-white px-3.5 text-sm font-medium text-[#111111] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] disabled:opacity-50 whitespace-nowrap dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => onPlayItem(items[0], items)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play All</span>
            </button>
          )}
        </div>
      </div>

      {seeds.length > 0 && (
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onSelectSeed(null)}
            className={`min-h-[36px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeSeed === null
                ? 'bg-[#E11D48] text-white'
                : 'border border-[#E5E3DD] bg-white text-[#5C5A55] hover:border-[#E11D48] hover:text-[#111111] dark:border-[#27272F] dark:bg-[#141418] dark:text-[#A1A1AA] dark:hover:text-white'
            }`}
          >
            All Mix
          </button>
          {seeds.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => onSelectSeed(seed)}
              className={`max-w-[200px] min-h-[36px] cursor-pointer truncate rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeSeed === seed
                  ? 'bg-[#E11D48] text-white'
                  : 'border border-[#E5E3DD] bg-white text-[#5C5A55] hover:border-[#E11D48] hover:text-[#111111] dark:border-[#27272F] dark:bg-[#141418] dark:text-[#A1A1AA] dark:hover:text-white'
              }`}
            >
              {seed}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[#E11D48]/30 bg-[#E11D48]/5 px-4 py-3 text-sm text-[#BE123C] dark:text-[#FB7185]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2.5">
              <div className="aspect-video w-full rounded-xl bg-[#EAE7E1] dark:bg-[#1E1E24]" />
              <div className="h-4 w-5/6 rounded bg-[#EAE7E1] dark:bg-[#1E1E24]" />
              <div className="h-3 w-1/2 rounded bg-[#EAE7E1] dark:bg-[#1E1E24]" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-[#E5E3DD] bg-white p-8 text-center dark:border-[#27272F] dark:bg-[#141418]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F3] text-[#E11D48] dark:bg-[#27272F]">
            <Compass className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[#111111] dark:text-[#F4F4F6]">
            Nothing in your feed yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5C5A55] dark:text-[#A1A1AA]">
            Search any channel and play or like a few songs and videos. Your personalized feed will
            automatically populate here.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#E11D48] px-4 text-xs font-medium text-white hover:bg-[#BE123C]"
          >
            <Loader2 className="hidden h-3.5 w-3.5" />
            <span>Load Discovery Mix</span>
          </button>
        </div>
      ) : appMode === 'music' ? (
        <div className="mt-6 space-y-2">
          {items.map((item, idx) => (
            <MusicTrackRow
              key={item.id}
              item={item}
              index={idx}
              isPlaying={playingItem?.id === item.id}
              isLiked={isLiked(item.id)}
              onPlay={(clicked) => onPlayItem(clicked, items)}
              onToggleLike={onToggleLike}
              onOpenChannel={onOpenChannel}
            />
          ))}
        </div>
      ) : splitActive && playingItem ? (
        <div className="mt-6">
          <DesktopSplitPlayer
            playingItem={playingItem}
            queue={items}
            queueTitle={
              activeTabName && activeTabName !== 'Main'
                ? `${activeTabName} Feed`
                : 'For You Feed'
            }
            startSeconds={startSeconds}
            hasPrev={hasPrev}
            hasNext={hasNext}
            isKidsTab={isKidsTab}
            isLiked={isLiked}
            onSelectVideo={(clicked) => onPlayItem(clicked, items)}
            onPrev={onPrev}
            onNext={onNext}
            onEnded={onEnded}
            onToggleLike={onToggleLike}
            onOpenFull={(sec) => onExpandFull(playingItem, 0, sec)}
            onLockKidsScreen={(sec) => onExpandFull(playingItem, 0, sec, true)}
            onClose={onStopPlay}
            onOpenChannel={onOpenChannel}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isPlaying={playingItem?.id === item.id}
              suppressInlineFrame={hasExpandedPlayer || isDesktop}
              isKidsTab={isKidsTab}
              isLiked={isLiked(item.id)}
              onPlay={(clicked) => onPlayItem(clicked, items)}
              onStopPlay={onStopPlay}
              onEnded={onEnded}
              onExpandFull={onExpandFull}
              onToggleLike={onToggleLike}
              onOpenChannel={onOpenChannel}
            />
          ))}
        </div>
      )}
    </main>
  );
}
