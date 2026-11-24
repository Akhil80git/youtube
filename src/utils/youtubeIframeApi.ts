export interface YTPlayerInstance {
  loadVideoById: (
    idOrOpts: string | { videoId: string; startSeconds?: number; suggestedQuality?: string }
  ) => void;
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  setPlaybackQuality?: (suggestedQuality: string) => void;
  unloadModule?: (moduleName: string) => void;
  setOption?: (moduleName: string, option: string, value: unknown) => void;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
}

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
            onApiChange?: (e: { target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function disableYouTubeCaptions(player: YTPlayerInstance | null | undefined): void {
  if (!player) return;
  try {
    player.unloadModule?.('captions');
    player.unloadModule?.('cc');
    player.setOption?.('captions', 'track', {});
    player.setOption?.('cc', 'track', {});
  } catch {
    // Ignore if captions module is not attached
  }
}

let ytApiPromise: Promise<void> | null = null;

export function ensureYouTubeIframeApi(): Promise<void> {
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
    setTimeout(resolve, 3500);
  });

  return ytApiPromise;
}

export function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}
