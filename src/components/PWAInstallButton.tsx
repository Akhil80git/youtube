import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'sidebar' | 'header';
}

export function PWAInstallButton({ variant = 'header' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else {
      setShowGuide(true);
    }
  };

  // Show when browser fires beforeinstallprompt or on iOS; also allow desktop Chromium/Android guide when opened in normal tab
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111111] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#E11D48] whitespace-nowrap"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Install App</span>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={handleClick}
          title="Install App"
          aria-label="Install PWA app"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#111111] px-2.5 text-xs font-medium text-white transition-colors hover:bg-[#E11D48] sm:h-10 sm:px-3 whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xs:inline">Install</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#111111] px-3 text-xs font-medium text-white transition-colors hover:bg-[#E11D48] whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>Install App</span>
        </button>
      )}

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install App Guide"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-[#111111]">
                {isIOS ? 'Install on iPhone / iPad' : 'Install youtube App'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#5C5A55] hover:bg-[#F2F0EC] hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#5C5A55]">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs font-semibold text-[#111111]">1.</span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-1 text-[#111111]">Share <Share className="inline h-3.5 w-3.5" /></strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs font-semibold text-[#111111]">2.</span>
                  <span>
                    Scroll down and tap <strong className="text-[#111111]">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[#5C5A55]">
                Click the install icon in your browser&apos;s address bar or menu to install{' '}
                <strong className="text-[#111111]">youtube</strong> as a standalone desktop or mobile app.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 h-10 w-full cursor-pointer rounded-xl bg-[#111111] text-sm font-medium text-white transition-colors hover:bg-[#E11D48]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
