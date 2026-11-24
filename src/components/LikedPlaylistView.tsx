import { Heart, Play, Repeat, Search, Shuffle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { LikedItem, MediaItem } from '../types';
import { DesktopSplitPlayer } from './DesktopSplitPlayer';
import { MediaCard } from './MediaCard';
import { MusicTrackRow } from './MusicTrackRow';

interface LikedPlaylistViewProps {
  appMode: 'videos' | 'music';
  isDesktop: boolean;
  isKidsTab?: boolean;
  likedItems: LikedItem[];
  playingItem: MediaItem | null;
  startSeconds: number;
  hasPrev: boolean;
  hasNext: boolean;
  hasExpandedPlayer: boolean;
  autoPlayNext: boolean;
  loopQueue: boolean;
  onPlayTrack: (item: MediaItem, shuffle?: boolean) => void;
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
  onToggleAutoPlay: () => void;
  onToggleLoop: () => void;
  onToggleLike: (item: MediaItem) => void;
  onClearAll: () => void;
}

export function LikedPlaylistView({
  appMode,
  isDesktop,
  isKidsTab = false,
  likedItems,
  playingItem,
  startSeconds,
  hasPrev,
  hasNext,
  hasExpandedPlayer,
  autoPlayNext,
  loopQueue,
  onPlayTrack,
  onStopPlay,
  onPrev,
  onNext,
  onEnded,
  onExpandFull,
  onToggleAutoPlay,
  onToggleLoop,
  onToggleLike,
  onClearAll,
}: LikedPlaylistViewProps) {
  const [filterText, setFilterText] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return likedItems;
    return likedItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.channelTitle || '').toLowerCase().includes(q)
    );
  }, [likedItems, filterText]);

  const splitActive =
    isDesktop && appMode === 'videos' && Boolean(playingItem) && !hasExpandedPlayer;

  return (
    <main className="mx-auto max-w-[1440px] px-3 pb-36 pt-5 sm:px-6 sm:pt-6 lg:pb-24">
      <div className="flex flex-col gap-4 border-b border-[#E5E3DD] pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-[#27272F]">
        <div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl dark:text-[#F4F4F6]">
            Liked Playlist
          </h1>
          <p className="mt-1 text-sm tabular-nums text-[#5C5A55] dark:text-[#A1A1AA]">
            {likedItems.length} {likedItems.length === 1 ? 'track' : 'tracks'} · Saved from any
            channel · Continuous auto-play
          </p>
        </div>

        {likedItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPlayTrack(likedItems[0], false)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play All</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const pick = likedItems[Math.floor(Math.random() * likedItems.length)];
                if (pick) onPlayTrack(pick, true);
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#E5E3DD] bg-white px-3.5 text-sm font-medium text-[#111111] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] whitespace-nowrap dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6]"
            >
              <Shuffle className="h-4 w-4" />
              <span>Shuffle</span>
            </button>

            <button
              type="button"
              onClick={onToggleAutoPlay}
              className={`inline-flex h-10 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                autoPlayNext
                  ? 'border-[#E11D48] bg-[#FFF1F3] text-[#BE123C] dark:bg-[#E11D48]/20 dark:text-[#FB7185]'
                  : 'border-[#E5E3DD] bg-white text-[#5C5A55] dark:border-[#27272F] dark:bg-[#141418] dark:text-[#A1A1AA]'
              }`}
            >
              Auto-Play: {autoPlayNext ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                loopQueue
                  ? 'border-[#E11D48] bg-[#FFF1F3] text-[#BE123C] dark:bg-[#E11D48]/20 dark:text-[#FB7185]'
                  : 'border-[#E5E3DD] bg-white text-[#5C5A55] dark:border-[#27272F] dark:bg-[#141418] dark:text-[#A1A1AA]'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Loop</span>
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#E11D48] px-3.5 text-xs font-medium text-white hover:bg-[#BE123C] whitespace-nowrap"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-[#E5E3DD] bg-white px-3 text-xs font-medium text-[#5C5A55] whitespace-nowrap dark:border-[#27272F] dark:bg-[#141418] dark:text-[#A1A1AA]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                aria-label="Clear liked playlist"
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E3DD] bg-white px-3 text-sm font-medium text-[#5C5A55] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] whitespace-nowrap dark:border-[#27272F] dark:bg-[#141418] dark:text-[#A1A1AA]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {likedItems.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#73716C] dark:text-[#A1A1AA]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter liked tracks or channels..."
              className="h-10 w-full rounded-lg border border-[#E5E3DD] bg-white pl-8 pr-3 text-xs text-[#111111] placeholder:text-[#73716C] focus:border-[#E11D48] focus:outline-none sm:h-9 dark:border-[#27272F] dark:bg-[#141418] dark:text-[#F4F4F6] dark:placeholder:text-[#71717A]"
            />
          </div>
        </div>
      )}

      {likedItems.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-[#E5E3DD] bg-white p-8 text-center dark:border-[#27272F] dark:bg-[#141418]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F3] text-[#E11D48] dark:bg-[#27272F]">
            <Heart className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[#111111] dark:text-[#F4F4F6]">
            No liked tracks yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5C5A55] dark:text-[#A1A1AA]">
            Tap the heart button on any video, short, or song from any channel. Everything you
            like collects here so you can auto-play them continuously.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#5C5A55] dark:text-[#A1A1AA]">
          No liked tracks matching &ldquo;{filterText}&rdquo;.
        </div>
      ) : appMode === 'music' ? (
        <div className="mt-6 space-y-2">
          {filtered.map((item, idx) => (
            <MusicTrackRow
              key={item.id}
              item={item}
              index={idx}
              isPlaying={playingItem?.id === item.id}
              isLiked={true}
              onPlay={(clicked) => onPlayTrack(clicked, false)}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      ) : splitActive && playingItem ? (
        <div className="mt-6">
          <DesktopSplitPlayer
            playingItem={playingItem}
            queue={filtered}
            queueTitle="Liked Playlist"
            startSeconds={startSeconds}
            hasPrev={hasPrev}
            hasNext={hasNext}
            isKidsTab={isKidsTab}
            isLiked={() => true}
            onSelectVideo={(clicked) => onPlayTrack(clicked, false)}
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
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isPlaying={playingItem?.id === item.id}
              suppressInlineFrame={hasExpandedPlayer || isDesktop}
              isKidsTab={isKidsTab}
              isLiked={true}
              onPlay={(clicked) => onPlayTrack(clicked, false)}
              onStopPlay={onStopPlay}
              onEnded={onEnded}
              onExpandFull={onExpandFull}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </main>
  );
}
