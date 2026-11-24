import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Play,
  Repeat,
  Shuffle,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  loadVideoById: (id: string) => void;
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

let ytApiPromise: Promise<void> | null = null;

function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      resolve();
    };
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => resolve();
      document.head.appendChild(tag);
    }
    // Safety fallback timeout so UI never hangs if script blocked
    setTimeout(resolve, 3500);
  });

  return ytApiPromise;
}

interface InlinePlayerProps {
  current: MediaItem;
  queue: MediaItem[];
  channelTitle: string;
  queueLabel?: string;
  autoPlayNext: boolean;
  loopQueue: boolean;
  shuffleQueue: boolean;
  isLiked: (id: string) => boolean;
  onToggleLike: (item: MediaItem) => void;
  onToggleAutoPlay: () => void;
  onToggleLoop: () => void;
  onToggleShuffle: () => void;
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}

function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export function InlinePlayer({
  current,
  queue,
  channelTitle,
  queueLabel,
  autoPlayNext,
  loopQueue,
  shuffleQueue,
  isLiked,
  onToggleLike,
  onToggleAutoPlay,
  onToggleLoop,
  onToggleShuffle,
  onSelect,
  onClose,
}: InlinePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedIdRef = useRef<string>('');
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const currentIndex = queue.findIndex((q) => q.id === current.id);
  const hasPrev = currentIndex > 0;
  const hasNext =
    queue.length > 1 &&
    (shuffleQueue || loopQueue || (currentIndex >= 0 && currentIndex < queue.length - 1));

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffleQueue && queue.length > 1) {
      const candidates = queue.filter((q) => q.id !== current.id);
      const randomNext = candidates[Math.floor(Math.random() * candidates.length)];
      if (randomNext) onSelect(randomNext);
      return;
    }
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      onSelect(queue[currentIndex + 1]);
    } else if (loopQueue && queue.length > 0) {
      onSelect(queue[0]);
    }
  }, [queue, current.id, currentIndex, shuffleQueue, loopQueue, onSelect]);

  const playPrev = useCallback(() => {
    if (hasPrev) {
      onSelect(queue[currentIndex - 1]);
    } else if (loopQueue && queue.length > 0) {
      onSelect(queue[queue.length - 1]);
    }
  }, [hasPrev, loopQueue, queue, currentIndex, onSelect]);

  const playNextRef = useRef(playNext);
  const autoPlayRef = useRef(autoPlayNext);
  playNextRef.current = playNext;
  autoPlayRef.current = autoPlayNext;

  // Escape key closes player
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Update mobile Media Session metadata & lock-screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.channelTitle || channelTitle,
        album: queueLabel || 'ChannelPlay',
        artwork: current.thumbnail
          ? [{ src: current.thumbnail, sizes: '480x360', type: 'image/jpeg' }]
          : [],
      });
      navigator.mediaSession.setActionHandler('nexttrack', hasNext ? () => playNext() : null);
      navigator.mediaSession.setActionHandler('previoustrack', hasPrev ? () => playPrev() : null);
    } catch {
      // MediaSession not supported in some browsers
    }
  }, [current, channelTitle, queueLabel, hasNext, hasPrev, playNext, playPrev]);

  // Mount & update YouTube IFrame Player API for seamless auto-next on track end
  useEffect(() => {
    if (!isValidVideoId(current.id)) return;
    let cancelled = false;

    async function setupOrLoad() {
      await ensureYouTubeIframeApi();
      if (cancelled) return;

      if (!window.YT || !window.YT.Player || !hostRef.current) {
        setApiUnavailable(true);
        return;
      }

      if (playerRef.current && loadedIdRef.current !== current.id) {
        loadedIdRef.current = current.id;
        try {
          playerRef.current.loadVideoById(current.id);
          return;
        } catch {
          // Fall through and recreate
        }
      }

      if (!playerRef.current) {
        hostRef.current.innerHTML = '';
        const mountNode = document.createElement('div');
        mountNode.className = 'h-full w-full';
        hostRef.current.appendChild(mountNode);
        loadedIdRef.current = current.id;

        playerRef.current = new window.YT.Player(mountNode, {
          videoId: current.id,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              try {
                e.target.playVideo();
              } catch {
                // Autoplay may be blocked by browser policy
              }
            },
            onStateChange: (e) => {
              // 0 === YT.PlayerState.ENDED
              if (e.data === 0 && autoPlayRef.current) {
                playNextRef.current();
              }
            },
          },
        });
      }
    }

    setupOrLoad();

    return () => {
      cancelled = true;
    };
  }, [current.id]);

  // Clean up YT player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy error
        }
        playerRef.current = null;
      }
    };
  }, []);

  if (!isValidVideoId(current.id)) return null;

  const isShort = current.type === 'short';
  const currentLiked = isLiked(current.id);
  const embedUrl = `https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  const watchUrl = isShort
    ? `https://www.youtube.com/shorts/${current.id}`
    : `https://www.youtube.com/watch?v=${current.id}`;

  return (
    <section
      aria-label="Video player"
      className="border-b border-[#27272A] bg-[#0B0B0C] text-white"
    >
      <div className="mx-auto max-w-[1360px] px-3 py-4 sm:px-6 sm:py-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Video Stage */}
          <div className="lg:col-span-8">
            <div
              className={`relative w-full overflow-hidden rounded-xl bg-black ${
                isShort ? 'mx-auto aspect-[9/16] max-h-[500px] max-w-[300px]' : 'aspect-video'
              }`}
            >
              {apiUnavailable ? (
                <iframe
                  key={current.id}
                  src={embedUrl}
                  title={current.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <div ref={hostRef} className="h-full w-full" />
              )}
            </div>

            <div className="mt-3.5 space-y-3 sm:mt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold leading-snug text-white sm:text-xl">
                    {current.title}
                  </h2>
                  <p className="mt-1 truncate text-xs tabular-nums text-[#A1A1AA]">
                    {[current.channelTitle || channelTitle, current.viewsText, current.publishedText]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleLike(current)}
                  aria-label={currentLiked ? 'Remove from Liked Playlist' : 'Add to Liked Playlist'}
                  aria-pressed={currentLiked}
                  className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors sm:h-9 whitespace-nowrap ${
                    currentLiked
                      ? 'border-[#E11D48] bg-[#E11D48] text-white'
                      : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${currentLiked ? 'fill-current' : ''}`} />
                  <span>{currentLiked ? 'Liked' : 'Like'}</span>
                </button>
              </div>

              {/* Player Controls Row (mobile-friendly wrap) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasPrev && !loopQueue}
                    onClick={playPrev}
                    className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:h-9 whitespace-nowrap"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={playNext}
                    className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:h-9 whitespace-nowrap"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleAutoPlay}
                    aria-pressed={autoPlayNext}
                    className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors sm:h-9 whitespace-nowrap ${
                      autoPlayNext
                        ? 'border-white/30 bg-white text-[#111111]'
                        : 'border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <span>Auto-Play: {autoPlayNext ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleLoop}
                    aria-pressed={loopQueue}
                    title="Loop Queue"
                    className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors sm:h-9 whitespace-nowrap ${
                      loopQueue
                        ? 'border-white/30 bg-white/20 text-white'
                        : 'border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Loop</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleShuffle}
                    aria-pressed={shuffleQueue}
                    title="Shuffle Queue"
                    className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors sm:h-9 whitespace-nowrap ${
                      shuffleQueue
                        ? 'border-white/30 bg-white/20 text-white'
                        : 'border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on YouTube"
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-[#D4D4D8] transition-colors hover:bg-white/10 hover:text-white sm:h-9 whitespace-nowrap"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>YouTube</span>
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close player"
                    className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-[#E11D48] sm:h-9 whitespace-nowrap"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Up Next Queue */}
          <div className="flex max-h-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141416] lg:col-span-4 lg:max-h-[490px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="truncate text-xs font-semibold tracking-wide text-white">
                {queueLabel || 'Queue'}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-[#A1A1AA]">
                {currentIndex >= 0 ? `${currentIndex + 1} / ${queue.length}` : `${queue.length}`}
              </span>
            </div>

            <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
              {queue.map((item, idx) => {
                const active = item.id === current.id;
                const liked = isLiked(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                      active ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-0.5 text-left"
                    >
                      <span className="w-5 shrink-0 text-center font-mono text-[11px] tabular-nums text-[#71717A]">
                        {active ? (
                          <Play className="mx-auto h-3 w-3 fill-[#E11D48] text-[#E11D48]" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded bg-black sm:w-24">
                        <img
                          src={item.thumbnail}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        {item.duration && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 font-mono text-[10px] tabular-nums text-white">
                            {item.duration}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`line-clamp-2 text-xs font-medium leading-snug ${
                            active ? 'text-white' : 'text-[#E4E4E7]'
                          }`}
                        >
                          {item.title}
                        </div>
                        {(item.channelTitle || item.viewsText) && (
                          <div className="mt-0.5 truncate text-[11px] tabular-nums text-[#A1A1AA]">
                            {[item.channelTitle, item.viewsText].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleLike(item)}
                      aria-label={liked ? 'Unlike' : 'Like'}
                      className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                        liked ? 'text-[#E11D48]' : 'text-[#71717A] hover:text-white'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
