import {
  Disc3,
  Heart,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';
import {
  ensureYouTubeIframeApi,
  isValidVideoId,
  type YTPlayerInstance,
} from '../utils/youtubeIframeApi';

interface MusicPlayerBarProps {
  current: MediaItem;
  hasPrev: boolean;
  hasNext: boolean;
  isLiked: boolean;
  shuffleQueue: boolean;
  loopQueue: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEnded: () => void;
  onToggleLike: (item: MediaItem) => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onClose: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicPlayerBar({
  current,
  hasPrev,
  hasNext,
  isLiked,
  shuffleQueue,
  loopQueue,
  onPrev,
  onNext,
  onEnded,
  onToggleLike,
  onToggleShuffle,
  onToggleLoop,
  onClose,
}: MusicPlayerBarProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedIdRef = useRef('');
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const [isPlayingState, setIsPlayingState] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!isValidVideoId(current.id)) return;
    let cancelled = false;
    setCurrentTime(0);
    setDuration(0);
    setIsPlayingState(true);

    async function setupAudioPlayer() {
      await ensureYouTubeIframeApi();
      if (cancelled || !window.YT?.Player || !hostRef.current) return;

      if (playerRef.current && loadedIdRef.current !== current.id) {
        loadedIdRef.current = current.id;
        try {
          playerRef.current.loadVideoById({
            videoId: current.id,
            suggestedQuality: 'small',
          });
          playerRef.current.setPlaybackQuality?.('small');
          return;
        } catch {
          // recreate below if needed
        }
      }

      if (!playerRef.current) {
        hostRef.current.innerHTML = '';
        const node = document.createElement('div');
        hostRef.current.appendChild(node);
        loadedIdRef.current = current.id;

        playerRef.current = new window.YT.Player(node, {
          videoId: current.id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            vq: 'small',
          },
          events: {
            onReady: (e) => {
              try {
                e.target.setPlaybackQuality?.('small');
                e.target.playVideo();
              } catch {
                // ignore autoplay restrictions
              }
            },
            onStateChange: (e) => {
              if (e.data === 1) {
                setIsPlayingState(true);
                try {
                  e.target.setPlaybackQuality?.('small');
                } catch {
                  // ignore
                }
              } else if (e.data === 2) {
                setIsPlayingState(false);
              } else if (e.data === 0) {
                onEndedRef.current();
              }
            },
          },
        });
      }
    }

    setupAudioPlayer();

    return () => {
      cancelled = true;
    };
  }, [current.id]);

  // Poll progress cleanly while track is active
  useEffect(() => {
    const interval = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const cur = p.getCurrentTime?.() ?? 0;
        const dur = p.getDuration?.() ?? 0;
        if (Number.isFinite(cur)) setCurrentTime(cur);
        if (Number.isFinite(dur) && dur > 0) setDuration(dur);
      } catch {
        // ignore transient player read errors
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Media Session metadata for mobile lock-screen / OS controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.channelTitle || 'youtube Music',
        artwork: current.thumbnail ? [{ src: current.thumbnail, sizes: '480x360' }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => {
        playerRef.current?.playVideo();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        playerRef.current?.pauseVideo();
      });
      navigator.mediaSession.setActionHandler('previoustrack', hasPrev ? onPrev : null);
      navigator.mediaSession.setActionHandler('nexttrack', hasNext ? onNext : null);
    } catch {
      // ignore unsupported mediaSession actions
    }
  }, [current.title, current.channelTitle, current.thumbnail, hasPrev, hasNext, onPrev, onNext]);

  // Cleanup on unmount
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

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  function handleTogglePlayPause() {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlayingState) {
        p.pauseVideo();
        setIsPlayingState(false);
      } else {
        p.playVideo();
        setIsPlayingState(true);
      }
    } catch {
      // ignore
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration || !playerRef.current?.seekTo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * duration;
    playerRef.current.seekTo(targetSec, true);
    setCurrentTime(targetSec);
  }

  function handleToggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute?.();
      setMuted(false);
    } else {
      p.mute?.();
      setMuted(true);
    }
  }

  return (
    <>
      {/* Hidden 1x1 low-bandwidth audio stream player (never displays video) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-10 -left-10 h-1 w-1 overflow-hidden opacity-0"
      >
        <div ref={hostRef} className="h-full w-full" />
      </div>

      {/* Spotify-style Fixed Bottom Audio Bar */}
      <aside
        aria-label="Music player"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#111111]/95 text-white backdrop-blur-md"
      >
        {/* Interactive Top Progress Strip */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Seek track position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onClick={handleSeek}
          className="group relative h-1.5 w-full cursor-pointer bg-white/15 transition-all hover:h-2"
        >
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full bg-[#E11D48] transition-[width] duration-200"
          />
        </div>

        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-3 px-3 sm:px-6">
          {/* Left: Square Album Art + Track Details */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
              {current.thumbnail ? (
                <img
                  src={current.thumbnail}
                  alt={current.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/70">
                  <Disc3 className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{current.title}</div>
              <div className="flex items-center gap-1.5 truncate text-xs text-white/65">
                {current.channelTitle && <span className="truncate">{current.channelTitle}</span>}
                {current.channelTitle && duration > 0 && <span aria-hidden="true">·</span>}
                {duration > 0 && (
                  <span className="font-mono tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center/Right: Spotify-style Playback Controls */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Toggle shuffle"
              aria-pressed={shuffleQueue}
              className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors sm:inline-flex ${
                shuffleQueue ? 'text-[#E11D48]' : 'text-white/65 hover:text-white'
              }`}
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              aria-label="Previous track"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlayPause}
              aria-label={isPlayingState ? 'Pause track' : 'Play track'}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[#111111] transition-transform hover:scale-105"
            >
              {isPlayingState ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 translate-x-0.5 fill-current" />
              )}
            </button>

            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              aria-label="Next track"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              aria-label="Toggle loop"
              aria-pressed={loopQueue}
              className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors sm:inline-flex ${
                loopQueue ? 'text-[#E11D48]' : 'text-white/65 hover:text-white'
              }`}
            >
              <Repeat className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white/70 transition-colors hover:text-white md:inline-flex"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => onToggleLike(current)}
              aria-label={isLiked ? 'Unlike track' : 'Like track'}
              aria-pressed={isLiked}
              className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
                isLiked ? 'text-[#E11D48]' : 'text-white/75 hover:text-white'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close music player"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
