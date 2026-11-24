import { ArrowLeft, Loader2, Play, Search } from 'lucide-react';
import type { ChannelSearchResult, MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { MusicTrackRow } from './MusicTrackRow';

interface SearchResultsViewProps {
  appMode: 'videos' | 'music';
  searchQuery: string;
  videos: MediaItem[];
  channels: ChannelSearchResult[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  playingItem: MediaItem | null;
  hasExpandedPlayer: boolean;
  hasChannelOpen: boolean;
  isLiked: (id: string) => boolean;
  onPlayItem: (item: MediaItem, queue: MediaItem[]) => void;
  onStopPlay: () => void;
  onEnded: () => void;
  onExpandFull: (item: MediaItem, initialRotation: 0 | 90 | 180 | 270) => void;
  onToggleLike: (item: MediaItem) => void;
  onOpenChannel: (path: string) => void;
  onLoadMore: () => void;
  onBack: () => void;
}

export function SearchResultsView({
  appMode,
  searchQuery,
  videos,
  channels,
  hasMore,
  loading,
  loadingMore,
  error,
  playingItem,
  hasExpandedPlayer,
  hasChannelOpen,
  isLiked,
  onPlayItem,
  onStopPlay,
  onEnded,
  onExpandFull,
  onToggleLike,
  onOpenChannel,
  onLoadMore,
  onBack,
}: SearchResultsViewProps) {
  return (
    <main className="mx-auto max-w-[1360px] px-3 pb-24 pt-5 sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-4 border-b border-[#E5E3DD] pb-5 sm:flex-row sm:items-end sm:justify-between">
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
            {searchQuery ? `Results for “${searchQuery}”` : 'Search Videos & Songs'}
          </h1>
          <p className="mt-1 text-sm tabular-nums text-[#5C5A55]">
            {loading
              ? 'Finding videos and songs...'
              : `${videos.length} ${videos.length === 1 ? 'video' : 'videos'} loaded`}
          </p>
        </div>

        {!loading && videos.length > 0 && (
          <button
            type="button"
            onClick={() => onPlayItem(videos[0], videos)}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-medium text-white transition-colors hover:bg-[#BE123C] whitespace-nowrap"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Play All</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[#E11D48]/30 bg-[#E11D48]/5 px-4 py-3 text-sm text-[#BE123C]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2.5">
              <div className="aspect-video w-full rounded-xl bg-[#EAE7E1]" />
              <div className="h-4 w-5/6 rounded bg-[#EAE7E1]" />
              <div className="h-3 w-1/2 rounded bg-[#EAE7E1]" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {channels.length > 0 && (
            <section className="mt-5 border-b border-[#E5E3DD] pb-5">
              <h2 className="font-display text-xs font-semibold tracking-wide text-[#5C5A55]">
                Matching Channels
              </h2>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onOpenChannel(ch.path)}
                    className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-[#E5E3DD] bg-white p-3 text-left transition-colors hover:border-[#111111]"
                  >
                    {ch.avatar ? (
                      <img
                        src={ch.avatar}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 shrink-0 rounded-full bg-[#F2F0EC] object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111111] font-display text-xs font-bold text-white">
                        {ch.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#111111]">
                        {ch.title}
                      </div>
                      <div className="truncate text-xs text-[#73716C]">
                        {[ch.handle, ch.subscribersText].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {videos.length === 0 ? (
            <div className="mx-auto mt-14 max-w-md rounded-2xl border border-[#E5E3DD] bg-white p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F7] text-[#111111]">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[#111111]">
                No videos found
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5A55]">
                Try another song name, topic, or channel title in the top search bar.
              </p>
            </div>
          ) : (
            <>
              {appMode === 'music' ? (
                <div className="mt-6 space-y-2">
                  {videos.map((item, idx) => (
                    <MusicTrackRow
                      key={item.id}
                      item={item}
                      index={idx}
                      isPlaying={playingItem?.id === item.id}
                      isLiked={isLiked(item.id)}
                      onPlay={(clicked) => onPlayItem(clicked, videos)}
                      onToggleLike={onToggleLike}
                      onOpenChannel={onOpenChannel}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {videos.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      isPlaying={playingItem?.id === item.id}
                      suppressInlineFrame={hasExpandedPlayer}
                      isLiked={isLiked(item.id)}
                      onPlay={(clicked) => onPlayItem(clicked, videos)}
                      onStopPlay={onStopPlay}
                      onEnded={onEnded}
                      onExpandFull={onExpandFull}
                      onToggleLike={onToggleLike}
                      onOpenChannel={onOpenChannel}
                    />
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="mt-10 flex items-center justify-between border-t border-[#E5E3DD] pt-6">
                  <p className="text-xs tabular-nums text-[#5C5A55]">
                    Showing {videos.length} results
                  </p>
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={onLoadMore}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#111111] px-5 text-sm font-medium text-white transition-colors hover:bg-[#E11D48] disabled:opacity-50"
                  >
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{loadingMore ? 'Loading...' : 'Load More Videos'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
