import { Heart, ListVideo, Maximize2, Play, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem, PlaylistCard } from '../types';
import {
  disableYouTubeCaptions,
  ensureYouTubeIframeApi,
  isValidVideoId,
  type YTPlayerInstance,
} from '../utils/youtubeIframeApi';

interface MediaCardProps {
  item: MediaItem;
  isPlaying: boolean;
  suppressInlineFrame?: boolean;
  isKidsTab?: boolean;
  isLiked: boolean;
  onPlay: (item: MediaItem) => void;
  onStopPlay: () => void;
  onEnded: () => void;
  onExpandFull: (item: MediaItem, initialRotation: 0 | 90 | 180 | 270) => void;
  onToggleLike: (item: MediaItem) => void;
  onOpenChannel?: (path: string) => void;
}

function InlineCardPlayer({
  videoId,
  title,
  rotation,
  onEnded,
}: {
  videoId: string;
  title: string;
  rotation: 0 | 90 | 180 | 270;
  onEnded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const onEndedRef = useRef(onEnded);
  const [fallback, setFallback] = useState(false);

  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!isValidVideoId(videoId)) return;
    let cancelled = false;

    async function mountPlayer() {
      await ensureYouTubeIframeApi();
      if (cancelled) return;

      if (!window.YT || !window.YT.Player || !hostRef.current) {
        setFallback(true);
        return;
      }

      hostRef.current.innerHTML = '';
      const node = document.createElement('div');
      node.className = 'h-full w-full';
      hostRef.current.appendChild(node);

      playerRef.current = new window.YT.Player(node, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          cc_load_policy: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            disableYouTubeCaptions(e.target);
            try {
              e.target.playVideo();
            } catch {
              // ignore autoplay restriction
            }
          },
          onApiChange: (e) => {
            disableYouTubeCaptions(e.target);
          },
          onStateChange: (e) => {
            if (e.data === 1 || e.data === 3 || e.data === 5) {
              disableYouTubeCaptions(e.target);
            }
            if (e.data === 0) {
              onEndedRef.current();
            }
          },
        },
      });
    }

    mountPlayer();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const rotationClass =
    rotation === 90
      ? 'rotate-90 scale-[0.5625]'
      : rotation === 180
        ? 'rotate-180'
        : rotation === 270
          ? '-rotate-90 scale-[0.5625]'
          : '';

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3`;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <div className={`h-full w-full transition-transform duration-200 ${rotationClass}`}>
        {fallback ? (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <div ref={hostRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}

export function MediaCard({
  item,
  isPlaying,
  suppressInlineFrame = false,
  isKidsTab = false,
  isLiked,
  onPlay,
  onStopPlay,
  onEnded,
  onExpandFull,
  onToggleLike,
  onOpenChannel,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const isShort = item.type === 'short';

  useEffect(() => {
    if (!isPlaying) setRotation(0);
  }, [isPlaying]);

  function handleRotateClick() {
    const isPortraitMobile =
      typeof window !== 'undefined' &&
      window.innerWidth < 768 &&
      window.innerHeight > window.innerWidth;

    if (isPortraitMobile || isKidsTab) {
      onExpandFull(item, 90);
      return;
    }

    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  }

  return (
    <div className="group relative flex w-full flex-col">
      <div
        className={`relative w-full overflow-hidden rounded-xl bg-[#EAE7E1] dark:bg-[#1E1E24] ${
          isShort ? 'aspect-[9/16]' : 'aspect-video'
        } ${
          isPlaying
            ? 'ring-2 ring-[#E11D48] ring-offset-2 ring-offset-[#FAF9F7] dark:ring-offset-[#0B0B0D]'
            : ''
        }`}
      >
        {isPlaying && !suppressInlineFrame && isValidVideoId(item.id) ? (
          <InlineCardPlayer
            videoId={item.id}
            title={item.title}
            rotation={rotation}
            onEnded={onEnded}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => onPlay(item)}
              aria-label={`Play ${item.title}`}
              className="block h-full w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
            >
              {!imgError && item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F2F0EC] to-[#EAE7E1] p-4 text-center text-[#5C5A55] dark:from-[#232220] dark:to-[#141418] dark:text-white/80">
                  <Play className="mb-2 h-7 w-7 text-[#E11D48]" />
                  <span className="line-clamp-2 text-xs font-medium">{item.title}</span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-150 group-hover:bg-black/20">
                <div className="flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-[#E11D48]/95 text-white opacity-0 shadow-md transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
                  <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                </div>
              </div>

              {isPlaying ? (
                <span className="absolute bottom-2 right-2 rounded bg-[#E11D48] px-2 py-0.5 text-[11px] font-medium text-white">
                  Playing in Full View
                </span>
              ) : item.duration ? (
                <span
                  className={`absolute bottom-2 right-2 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
                    item.isLiveNow
                      ? 'bg-[#E11D48] text-white'
                      : 'bg-white/90 text-[#111111] shadow-xs dark:bg-black/80 dark:text-white'
                  }`}
                >
                  {item.duration}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(item);
              }}
              aria-label={isLiked ? `Remove ${item.title} from Liked Playlist` : `Like ${item.title}`}
              aria-pressed={isLiked}
              className={`absolute right-2 top-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${
                isLiked
                  ? 'bg-[#E11D48] text-white opacity-100 shadow-md'
                  : 'bg-white/85 text-[#111111] opacity-90 shadow-xs hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 dark:bg-black/60 dark:text-white dark:hover:bg-black/85'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </>
        )}
      </div>

      {/* Inline controls when this card is playing */}
      {isPlaying && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-[#E5E3DD] bg-white px-2.5 py-1.5 dark:border-[#27272F] dark:bg-[#141418]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRotateClick}
              title="Hard Rotate Video"
              className={`inline-flex lg:hidden h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                rotation !== 0
                  ? 'bg-[#E11D48] text-white'
                  : 'bg-[#FAF9F7] text-[#111111] hover:bg-[#EAE7E1] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:hover:bg-[#27272F]'
              }`}
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>{rotation !== 0 ? `${rotation}°` : 'Rotate'}</span>
            </button>

            <button
              type="button"
              onClick={() => onExpandFull(item, rotation)}
              title="Full View"
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-[#FAF9F7] px-2 text-xs font-medium text-[#111111] hover:bg-[#EAE7E1] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:hover:bg-[#27272F]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Full</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleLike(item)}
              aria-label={isLiked ? 'Unlike' : 'Like'}
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
                isLiked
                  ? 'bg-[#E11D48] text-white'
                  : 'bg-[#FAF9F7] text-[#5C5A55] hover:text-[#111111] dark:bg-[#1E1E24] dark:text-[#A1A1AA] dark:hover:text-white'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onStopPlay}
              aria-label="Stop video"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-[#FAF9F7] text-[#5C5A55] hover:bg-[#E11D48] hover:text-white dark:bg-[#1E1E24] dark:text-[#A1A1AA]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => (isPlaying ? onExpandFull(item, rotation) : onPlay(item))}
          className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
        >
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#111111] transition-colors group-hover:text-[#E11D48] dark:text-[#F4F4F6]">
            {item.title}
          </h3>
          {(item.channelTitle || item.viewsText || item.publishedText) && (
            <p className="mt-1 truncate text-[12px] tabular-nums text-[#5C5A55] dark:text-[#A1A1AA]">
              {item.channelTitle && item.channelPath && onOpenChannel ? (
                <>
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChannel(item.channelPath!);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenChannel(item.channelPath!);
                      }
                    }}
                    className="font-medium text-[#111111] hover:text-[#E11D48] hover:underline dark:text-[#F4F4F6]"
                  >
                    {item.channelTitle}
                  </span>
                  {(item.viewsText || item.publishedText) && (
                    <span>
                      {' · '}
                      {[item.viewsText, item.publishedText].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </>
              ) : (
                [item.channelTitle, item.viewsText, item.publishedText].filter(Boolean).join(' · ')
              )}
            </p>
          )}
        </button>

        {!isPlaying && (
          <button
            type="button"
            onClick={() => onToggleLike(item)}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            aria-pressed={isLiked}
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors sm:hidden ${
              isLiked
                ? 'text-[#E11D48]'
                : 'text-[#73716C] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

interface PlaylistCardItemProps {
  playlist: PlaylistCard;
  onSelect: (playlist: PlaylistCard) => void;
}

export function PlaylistCardItem({ playlist, onSelect }: PlaylistCardItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(playlist)}
      className="group flex w-full cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#EAE7E1] dark:bg-[#1E1E24]">
        {!imgError && playlist.thumbnail ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F2F0EC] text-[#5C5A55] dark:bg-[#232220] dark:text-white/70">
            <ListVideo className="h-8 w-8" />
          </div>
        )}

        <div className="absolute inset-y-0 right-0 flex w-2/5 flex-col items-center justify-center bg-white/85 px-2 text-center text-[#111111] backdrop-blur-[2px] dark:bg-black/70 dark:text-white">
          <ListVideo className="mb-1 h-5 w-5 text-[#E11D48]" />
          <span className="font-mono text-xs font-medium tabular-nums">
            {playlist.videoCountText}
          </span>
        </div>
      </div>

      <div className="mt-2.5 space-y-1">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#111111] transition-colors group-hover:text-[#E11D48] dark:text-[#F4F4F6]">
          {playlist.title}
        </h3>
        {playlist.updatedText && (
          <p className="truncate text-[12px] text-[#5C5A55] dark:text-[#A1A1AA]">
            {playlist.updatedText}
          </p>
        )}
      </div>
    </button>
  );
}
