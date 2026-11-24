import { Disc3, Heart, Pause, Play } from 'lucide-react';
import { useState } from 'react';
import type { MediaItem } from '../types';

interface MusicTrackRowProps {
  item: MediaItem;
  index?: number;
  isPlaying: boolean;
  isLiked: boolean;
  onPlay: (item: MediaItem) => void;
  onToggleLike: (item: MediaItem) => void;
  onOpenChannel?: (path: string) => void;
}

export function MusicTrackRow({
  item,
  index,
  isPlaying,
  isLiked,
  onPlay,
  onToggleLike,
  onOpenChannel,
}: MusicTrackRowProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors sm:gap-4 sm:px-3.5 sm:py-2.5 ${
        isPlaying
          ? 'border-[#111111] bg-white shadow-xs'
          : 'border-[#E5E3DD] bg-white hover:border-[#111111]'
      }`}
    >
      {/* Optional Track Index (Desktop) */}
      {typeof index === 'number' && (
        <span
          className={`hidden w-6 shrink-0 text-center font-mono text-xs tabular-nums sm:inline-block ${
            isPlaying ? 'font-semibold text-[#E11D48]' : 'text-[#73716C]'
          }`}
        >
          {index + 1}
        </span>
      )}

      {/* Left: Square Album/Track Thumbnail */}
      <button
        type="button"
        onClick={() => onPlay(item)}
        aria-label={`Play ${item.title}`}
        className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-[#EAE7E1] sm:h-16 sm:w-16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
      >
        {!imgError && item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white/80">
            <Disc3 className="h-5 w-5" />
          </div>
        )}

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isPlaying
              ? 'bg-black/55 opacity-100'
              : 'bg-black/45 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current text-white" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5 fill-current text-white" />
          )}
        </div>
      </button>

      {/* Right: Track Title & Details */}
      <button
        type="button"
        onClick={() => onPlay(item)}
        className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
      >
        <div
          className={`line-clamp-1 text-sm font-semibold sm:text-[15px] ${
            isPlaying ? 'text-[#E11D48]' : 'text-[#111111] group-hover:text-[#E11D48]'
          }`}
        >
          {item.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#5C5A55]">
          {item.channelTitle && item.channelPath && onOpenChannel ? (
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
              className="truncate font-medium text-[#111111] hover:text-[#E11D48] hover:underline"
            >
              {item.channelTitle}
            </span>
          ) : item.channelTitle ? (
            <span className="truncate font-medium text-[#3D3C38]">{item.channelTitle}</span>
          ) : null}

          {item.channelTitle && (item.viewsText || item.publishedText || item.duration) && (
            <span aria-hidden="true">·</span>
          )}

          <span className="truncate tabular-nums">
            {[item.viewsText, item.publishedText].filter(Boolean).join(' · ') ||
              (item.duration && item.duration !== 'Short' ? item.duration : 'Audio track')}
          </span>
        </div>
      </button>

      {/* Duration & Like Action */}
      <div className="flex shrink-0 items-center gap-2">
        {item.duration && (
          <span className="hidden font-mono text-xs tabular-nums text-[#73716C] sm:inline-block">
            {item.duration}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(item);
          }}
          aria-label={isLiked ? `Remove ${item.title} from Liked` : `Like ${item.title}`}
          aria-pressed={isLiked}
          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors ${
            isLiked
              ? 'text-[#E11D48]'
              : 'text-[#73716C] hover:bg-[#FAF9F7] hover:text-[#111111]'
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}
