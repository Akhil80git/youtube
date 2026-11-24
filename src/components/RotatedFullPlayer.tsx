import { Columns2, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';
import {
  ensureYouTubeIframeApi,
  isValidVideoId,
  type YTPlayerInstance,
} from '../utils/youtubeIframeApi';

interface RotatedFullPlayerProps {
  current: MediaItem;
  initialRotation: 0 | 90 | 180 | 270;
  startSeconds?: number;
  onSwitchHalf?: (currentSeconds: number) => void;
  onEnded: () => void;
  onClose: () => void;
}

export function RotatedFullPlayer({
  current,
  initialRotation,
  startSeconds = 0,
  onSwitchHalf,
  onEnded,
  onClose,
}: RotatedFullPlayerProps) {
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialRotation);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedIdRef = useRef<string>('');
  const onEndedRef = useRef(onEnded);
  const [fallback, setFallback] = useState(false);

  onEndedRef.current = onEnded;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isValidVideoId(current.id)) return;
    let cancelled = false;

    async function setup() {
      await ensureYouTubeIframeApi();
      if (cancelled) return;

      if (!window.YT || !window.YT.Player || !hostRef.current) {
        setFallback(true);
        return;
      }

      if (playerRef.current && loadedIdRef.current !== current.id) {
        loadedIdRef.current = current.id;
        try {
          playerRef.current.loadVideoById({
            videoId: current.id,
            startSeconds: startSeconds > 1 ? Math.floor(startSeconds) : 0,
          });
          return;
        } catch {
          // recreate
        }
      }

      if (!playerRef.current) {
        hostRef.current.innerHTML = '';
        const node = document.createElement('div');
        node.className = 'h-full w-full';
        hostRef.current.appendChild(node);
        loadedIdRef.current = current.id;

        playerRef.current = new window.YT.Player(node, {
          videoId: current.id,
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
                // ignore
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
  }, [current.id, startSeconds]);

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

  if (!isValidVideoId(current.id)) return null;

  const isSideways = rotation === 90 || rotation === 270;
  const embedStart = startSeconds > 1 ? `&start=${Math.floor(startSeconds)}` : '';
  const embedUrl = `https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1${embedStart}`;

  function handleHalfClick() {
    if (!onSwitchHalf) return;
    let sec = 0;
    try {
      sec = playerRef.current?.getCurrentTime?.() ?? 0;
    } catch {
      sec = 0;
    }
    onSwitchHalf(Number.isFinite(sec) ? sec : 0);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
    >
      {/* Mobile: Icon-only Rotate + Close. Laptop: Half-screen toggle + Close (no rotate needed) */}
      <div className="pointer-events-none fixed right-3 top-3 z-20 flex items-center gap-2">
        {onSwitchHalf && (
          <button
            type="button"
            onClick={handleHalfClick}
            aria-label="Switch to half screen split"
            className="pointer-events-auto hidden lg:inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/85 hover:text-white"
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Half</span>
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270)
          }
          aria-label="Rotate video"
          className="pointer-events-auto flex lg:hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close full player"
          className="pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Edge-to-edge full viewport video stage */}
      <div
        style={
          isSideways
            ? {
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100dvh',
                height: '100dvw',
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }
            : {
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100dvw',
                height: '100dvh',
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }
        }
        className="flex items-center justify-center transition-transform duration-200"
      >
        {fallback ? (
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
    </div>
  );
}
