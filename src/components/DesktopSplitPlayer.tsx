import {
  Columns2,
  Heart,
  Loader2,
  Maximize2,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';
import {
  ensureYouTubeIframeApi,
  isValidVideoId,
  type YTPlayerInstance,
} from '../utils/youtubeIframeApi';

interface DesktopSplitPlayerProps {
  playingItem: MediaItem;
  queue: MediaItem[];
  queueTitle?: string;
  startSeconds?: number;
  hasPrev: boolean;
  hasNext: boolean;
  isLiked: (id: string) => boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onSelectVideo: (item: MediaItem) => void;
  onPrev: () => void;
  onNext: () => void;
  onEnded: () => void;
  onToggleLike: (item: MediaItem) => void;
  onOpenFull: (currentSeconds: number) => void;
  onClose: () => void;
  onOpenChannel?: (path: string) => void;
}

export function DesktopSplitPlayer({
  playingItem,
  queue,
  queueTitle = 'All Videos',
  startSeconds = 0,
  hasPrev,
  hasNext,
  isLiked,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onSelectVideo,
  onPrev,
  onNext,
  onEnded,
  onToggleLike,
  onOpenFull,
  onClose,
  onOpenChannel,
}: DesktopSplitPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedIdRef = useRef('');
  const onEndedRef = useRef(onEnded);
  const [fallback, setFallback] = useState(false);

  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!isValidVideoId(playingItem.id)) return;
    let cancelled = false;

    async function setup() {
      await ensureYouTubeIframeApi();
      if (cancelled) return;

      if (!window.YT || !window.YT.Player || !hostRef.current) {
        setFallback(true);
        return;
      }

      if (playerRef.current && loadedIdRef.current !== playingItem.id) {
        loadedIdRef.current = playingItem.id;
        try {
          playerRef.current.loadVideoById({
            videoId: playingItem.id,
            startSeconds: startSeconds > 1 ? Math.floor(startSeconds) : 0,
          });
          return;
        } catch {
          // recreate below
        }
      }

      if (!playerRef.current) {
        hostRef.current.innerHTML = '';
        const node = document.createElement('div');
        node.className = 'h-full w-full';
        hostRef.current.appendChild(node);
        loadedIdRef.current = playingItem.id;

        playerRef.current = new window.YT.Player(node, {
          videoId: playingItem.id,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            ...(startSeconds > 1 ? { start: Math.floor(startSeconds) } : {}),
          },
          events: {
            onReady: (e) => {
              try {
                e.target.playVideo();
              } catch {
                // ignore autoplay restriction
              }
            },
            onStateChange: (e) => {
              if (e.data === 0) onEndedRef.current();
            },
          },
        });
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [playingItem.id, startSeconds]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, []);

  if (!isValidVideoId(playingItem.id)) return null;

  const likedActive = isLiked(playingItem.id);
  const currentIndex = queue.findIndex((q) => q.id === playingItem.id);
  const embedStart = startSeconds > 1 ? `&start=${Math.floor(startSeconds)}` : '';
  const embedUrl = `https://www.youtube.com/embed/${playingItem.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1${embedStart}`;

  function handleSwitchFull() {
    let sec = 0;
    try {
      sec = playerRef.current?.getCurrentTime?.() ?? 0;
    } catch {
      sec = 0;
    }
    onOpenFull(Number.isFinite(sec) ? sec : 0);
  }

  return (
    <section
      aria-label="Split screen video player"
      className="hidden lg:grid lg:grid-cols-12 lg:items-start lg:gap-6"
    >
      {/* Left Half: Sticky HD Video Player + Half/Full Option */}
      <div className="lg:sticky lg:top-20 lg:col-span-7">
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-black/10">
          {fallback ? (
            <iframe
              key={playingItem.id}
              src={embedUrl}
              title={playingItem.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            <div ref={hostRef} className="h-full w-full" />
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-[#E5E3DD] bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold leading-snug text-[#111111]">
                {playingItem.title}
              </h2>
              {(playingItem.channelTitle || playingItem.viewsText || playingItem.publishedText) && (
                <p className="mt-1.5 truncate text-xs tabular-nums text-[#5C5A55]">
                  {playingItem.channelTitle && playingItem.channelPath && onOpenChannel ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenChannel(playingItem.channelPath!)}
                        className="cursor-pointer font-semibold text-[#111111] hover:text-[#E11D48] hover:underline"
                      >
                        {playingItem.channelTitle}
                      </button>
                      {(playingItem.viewsText || playingItem.publishedText) && (
                        <span>
                          {' · '}
                          {[playingItem.viewsText, playingItem.publishedText]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </>
                  ) : (
                    [playingItem.channelTitle, playingItem.viewsText, playingItem.publishedText]
                      .filter(Boolean)
                      .join(' · ')
                  )}
                </p>
              )}
            </div>

            {/* Half vs Full Option */}
            <div
              role="group"
              aria-label="Player layout mode"
              className="inline-flex shrink-0 items-center rounded-lg border border-[#E5E3DD] bg-[#F2F0EC] p-0.5"
            >
              <button
                type="button"
                aria-pressed="true"
                className="inline-flex h-8 cursor-default items-center gap-1.5 rounded-md bg-[#111111] px-2.5 text-xs font-medium text-white whitespace-nowrap"
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span>Half</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchFull}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[#5C5A55] transition-colors hover:text-[#111111] whitespace-nowrap"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Full</span>
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-[#F2F0EC] pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={onPrev}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E3DD] bg-white px-3 text-xs font-medium text-[#111111] transition-colors hover:border-[#111111] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
              >
                <SkipBack className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={!hasNext}
                onClick={onNext}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E3DD] bg-white px-3 text-xs font-medium text-[#111111] transition-colors hover:border-[#111111] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
              >
                <span>Next</span>
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleLike(playingItem)}
                aria-pressed={likedActive}
                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  likedActive
                    ? 'border-[#E11D48] bg-[#E11D48] text-white'
                    : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#111111]'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${likedActive ? 'fill-current' : ''}`} />
                <span>{likedActive ? 'Liked' : 'Like'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close split player"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5E3DD] bg-white px-3 text-xs font-medium text-[#5C5A55] transition-colors hover:border-[#111111] hover:text-[#111111] whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Half: All Videos Lined Up Vertically */}
      <div className="lg:col-span-5">
        <div className="overflow-hidden rounded-2xl border border-[#E5E3DD] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E3DD] px-4 py-3">
            <div className="min-w-0">
              <h3 className="font-display truncate text-sm font-bold text-[#111111]">
                {queueTitle}
              </h3>
              <p className="font-mono text-[11px] tabular-nums text-[#73716C]">
                {currentIndex >= 0
                  ? `${currentIndex + 1} / ${queue.length} videos`
                  : `${queue.length} videos`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111] whitespace-nowrap"
            >
              Grid View
            </button>
          </div>

          <div className="max-h-[calc(100vh-11rem)] divide-y divide-[#F2F0EC] overflow-y-auto">
            {queue.map((vid, idx) => {
              const active = vid.id === playingItem.id;
              const vidLiked = isLiked(vid.id);
              return (
                <div
                  key={vid.id}
                  className={`group flex items-center gap-3 p-2.5 transition-colors ${
                    active ? 'bg-[#FAF9F7]' : 'hover:bg-[#FAF9F7]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectVideo(vid)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  >
                    <span
                      className={`w-5 shrink-0 text-center font-mono text-[11px] tabular-nums ${
                        active ? 'font-bold text-[#E11D48]' : 'text-[#73716C]'
                      }`}
                    >
                      {active ? (
                        <Play className="mx-auto h-3.5 w-3.5 fill-current" />
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <div
                      className={`relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-[#EAE7E1] xl:w-36 ${
                        active ? 'ring-2 ring-[#E11D48]' : ''
                      }`}
                    >
                      {vid.thumbnail ? (
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white">
                          <Play className="h-4 w-4" />
                        </div>
                      )}
                      {vid.duration && (
                        <span
                          className={`absolute bottom-1 right-1 rounded px-1 py-0.5 font-mono text-[10px] font-medium tabular-nums text-white ${
                            active
                              ? 'bg-[#E11D48]'
                              : vid.isLiveNow
                                ? 'bg-[#E11D48]'
                                : 'bg-black/80'
                          }`}
                        >
                          {active ? 'Playing' : vid.duration}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`line-clamp-2 text-[13px] font-semibold leading-snug ${
                          active
                            ? 'text-[#E11D48]'
                            : 'text-[#111111] group-hover:text-[#E11D48]'
                        }`}
                      >
                        {vid.title}
                      </div>
                      <div className="mt-1 truncate text-[11px] tabular-nums text-[#5C5A55]">
                        {[vid.channelTitle, vid.viewsText, vid.publishedText]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLike(vid)}
                    aria-label={vidLiked ? 'Unlike' : 'Like'}
                    aria-pressed={vidLiked}
                    className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                      vidLiked
                        ? 'text-[#E11D48]'
                        : 'text-[#73716C] opacity-70 hover:text-[#111111] group-hover:opacity-100'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${vidLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {hasMore && onLoadMore && (
            <div className="border-t border-[#E5E3DD] p-3">
              <button
                type="button"
                disabled={loadingMore}
                onClick={onLoadMore}
                className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#111111] text-xs font-medium text-white transition-colors hover:bg-[#E11D48] disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{loadingMore ? 'Loading...' : 'Load More Videos'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
