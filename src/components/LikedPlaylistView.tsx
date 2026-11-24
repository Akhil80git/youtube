import { ArrowLeft, Heart, Play, Search, Shuffle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { LikedItem, MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface LikedPlaylistViewProps {
  likedItems: LikedItem[];
  playingItem: MediaItem | null;
  hasChannelOpen: boolean;
  onPlayTrack: (item: MediaItem, shuffle?: boolean) => void;
  onToggleLike: (item: MediaItem) => void;
  onClearAll: () => void;
  onBack: () => void;
}

export function LikedPlaylistView({
  likedItems,
  playingItem,
  hasChannelOpen,
  onPlayTrack,
  onToggleLike,
  onClearAll,
  onBack,
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

  return (
    <main className="mx-auto max-w-[1360px] px-3 pb-16 pt-5 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#E5E3DD] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 text-xs font-medium text-[#5C5A55] hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{hasChannelOpen ? 'Back to Channel' : 'Back to Home'}</span>
          </button>

          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            Liked Playlist
          </h1>
          <p className="mt-1 text-sm tabular-nums text-[#5C5A55]">
            {likedItems.length} {likedItems.length === 1 ? 'track' : 'tracks'} · Saved from any
            channel · Continuous auto-play
          </p>
        </div>

        {likedItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onPlayTrack(likedItems[0], false)}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] sm:h-10 whitespace-nowrap"
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
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#E5E3DD] bg-white px-4 text-sm font-medium text-[#111111] transition-colors hover:border-[#111111] sm:h-10 whitespace-nowrap"
            >
              <Shuffle className="h-4 w-4" />
              <span>Shuffle</span>
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-[#111111] px-3.5 text-xs font-medium text-white hover:bg-[#E11D48] sm:h-10 whitespace-nowrap"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-[#E5E3DD] bg-white px-3 text-xs font-medium text-[#5C5A55] sm:h-10 whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                aria-label="Clear liked playlist"
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E3DD] bg-white px-3 text-sm font-medium text-[#5C5A55] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] sm:h-10 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {likedItems.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#73716C]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter liked tracks or channels..."
              className="h-10 w-full rounded-lg border border-[#E5E3DD] bg-white pl-8 pr-3 text-xs text-[#111111] placeholder:text-[#73716C] focus:border-[#111111] focus:outline-none sm:h-9"
            />
          </div>
        </div>
      )}

      {likedItems.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-[#E5E3DD] bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F7] text-[#E11D48]">
            <Heart className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[#111111]">
            No liked tracks yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5C5A55]">
            Tap the heart button on any video, short, or song from any channel. Everything you
            like collects here so you can auto-play them continuously.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#5C5A55]">
          No liked tracks matching &ldquo;{filterText}&rdquo;.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isPlaying={playingItem?.id === item.id}
              isLiked={true}
              onPlay={(clicked) => onPlayTrack(clicked, false)}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </main>
  );
}
