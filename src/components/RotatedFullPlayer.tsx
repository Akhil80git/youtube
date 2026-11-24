import { Columns2, KeyRound, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';
import {
  disableYouTubeCaptions,
  ensureYouTubeIframeApi,
  isValidVideoId,
  type YTPlayerInstance,
} from '../utils/youtubeIframeApi';
import { PinModal } from './PinModal';

interface RotatedFullPlayerProps {
  current: MediaItem;
  initialRotation: 0 | 90 | 180 | 270;
  startSeconds?: number;
  isKidsTab?: boolean;
  kidsPin?: string;
  initialLocked?: boolean;
  onSaveKidsPin?: (pin: string) => void;
  onSwitchHalf?: (currentSeconds: number) => void;
  onEnded: () => void;
  onClose: () => void;
}

type PendingLockAction = 'unlock' | 'close' | 'half';

export function RotatedFullPlayer({
  current,
  initialRotation,
  startSeconds = 0,
  isKidsTab = false,
  kidsPin,
  initialLocked = false,
  onSaveKidsPin,
  onSwitchHalf,
  onEnded,
  onClose,
}: RotatedFullPlayerProps) {
  const rotation = initialRotation;
  const [localKidsPin, setLocalKidsPin] = useState<string | undefined>(kidsPin);
  const [isLocked, setIsLocked] = useState<boolean>(
    Boolean(isKidsTab && kidsPin && (initialLocked || initialRotation !== 0))
  );
  const [pendingAction, setPendingAction] = useState<PendingLockAction | null>(null);
  const [setupPinPrompt, setSetupPinPrompt] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedIdRef = useRef<string>('');
  const onEndedRef = useRef(onEnded);
  const [fallback, setFallback] = useState(false);

  onEndedRef.current = onEnded;

  useEffect(() => {
    setLocalKidsPin(kidsPin);
  }, [kidsPin]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isLocked && localKidsPin) {
          e.preventDefault();
          setPendingAction('close');
        } else if (!pendingAction && !setupPinPrompt) {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLocked, localKidsPin, onClose, pendingAction, setupPinPrompt]);

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
            cc_load_policy: 0,
            iv_load_policy: 3,
            ...(startSeconds > 1 ? { start: Math.floor(startSeconds) } : {}),
          },
          events: {
            onReady: (e) => {
              disableYouTubeCaptions(e.target);
              try {
                e.target.playVideo();
              } catch {
                // ignore
              }
            },
            onApiChange: (e) => {
              disableYouTubeCaptions(e.target);
            },
            onStateChange: (e) => {
              if (e.data === 1 || e.data === 3 || e.data === 5) {
                disableYouTubeCaptions(e.target);
              }
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
  const embedUrl = `https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3${embedStart}`;

  function executeHalfSwitch() {
    if (!onSwitchHalf) return;
    let sec = 0;
    try {
      sec = playerRef.current?.getCurrentTime?.() ?? 0;
    } catch {
      sec = 0;
    }
    onSwitchHalf(Number.isFinite(sec) ? sec : 0);
  }

  function handleHalfClick() {
    if (isLocked && localKidsPin) {
      setPendingAction('half');
      return;
    }
    executeHalfSwitch();
  }

  function handleCloseClick() {
    if (isLocked && localKidsPin) {
      setPendingAction('close');
      return;
    }
    onClose();
  }

  function handlePasswordIconClick() {
    if (isLocked) {
      if (localKidsPin) {
        setPendingAction('unlock');
      } else {
        setIsLocked(false);
      }
      return;
    }

    if (localKidsPin) {
      setIsLocked(true);
    } else {
      setSetupPinPrompt(true);
    }
  }

  function handleVerifySuccess() {
    const action = pendingAction;
    setPendingAction(null);
    setIsLocked(false);

    if (action === 'close') {
      onClose();
    } else if (action === 'half') {
      executeHalfSwitch();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      className="fixed inset-0 z-50 overflow-hidden bg-black select-none"
    >
      {/* Full-viewport touch shield when Kids Screen Lock is active: blocks all touches & clicks on video */}
      {isLocked && (
        <div
          aria-label="Screen locked for kids playback"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          className="fixed inset-0 z-10 pointer-events-auto touch-none select-none bg-transparent"
        />
      )}

      {/* Ultra-compact corner icons: only tiny Password/Lock icon (in Kids mode) + tiny Cross icon (no Rotate needed inside) */}
      <div className="pointer-events-none fixed right-2.5 top-2.5 z-20 flex items-center gap-1.5">
        {onSwitchHalf && (
          <button
            type="button"
            onClick={handleHalfClick}
            aria-label="Switch to half screen split"
            className="pointer-events-auto hidden lg:inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-black/50 px-2.5 text-[11px] font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
          >
            <Columns2 className="h-3 w-3" />
            <span>Half</span>
          </button>
        )}

        {isKidsTab && (
          <button
            type="button"
            onClick={handlePasswordIconClick}
            aria-label={isLocked ? 'Enter PIN to unlock' : 'Lock screen with PIN'}
            title={isLocked ? 'Enter PIN' : 'Lock screen'}
            className={`pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
              isLocked
                ? 'bg-[#E11D48]/80 text-white hover:bg-[#E11D48]'
                : 'bg-black/35 text-white/75 hover:bg-black/75 hover:text-white'
            }`}
          >
            {isLocked ? <Lock className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
          </button>
        )}

        <button
          type="button"
          onClick={handleCloseClick}
          aria-label={isLocked ? 'Close full player (PIN required)' : 'Close full player'}
          className="pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white/75 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
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
        className={`flex items-center justify-center transition-transform duration-200 ${
          isLocked ? 'pointer-events-none' : ''
        }`}
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

      {/* Verify Kids PIN when locked user clicks tiny Lock or Cross icon */}
      {pendingAction && localKidsPin && (
        <PinModal
          mode="verify"
          title="Enter Password"
          subtitle="Enter 1–4 digit PIN to unlock or exit"
          expectedPin={localKidsPin}
          onSuccess={handleVerifySuccess}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Optional setup only if user intentionally taps the tiny key icon when no PIN was set beforehand */}
      {setupPinPrompt && (
        <PinModal
          mode="setup"
          title="Set Kids Screen PIN"
          subtitle="Enter 1–4 digit PIN to lock screen"
          onSuccess={(newPin) => {
            setLocalKidsPin(newPin);
            onSaveKidsPin?.(newPin);
            setSetupPinPrompt(false);
            setIsLocked(true);
          }}
          onCancel={() => setSetupPinPrompt(false)}
        />
      )}
    </div>
  );
}


