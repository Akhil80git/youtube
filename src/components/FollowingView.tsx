import { ArrowLeft, ArrowRight, Search, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FollowedChannel } from '../types';

interface FollowingViewProps {
  followedChannels: FollowedChannel[];
  hasChannelOpen: boolean;
  onOpenChannel: (path: string) => void;
  onUnfollow: (id: string) => void;
  onBack: () => void;
}

export function FollowingView({
  followedChannels,
  hasChannelOpen,
  onOpenChannel,
  onUnfollow,
  onBack,
}: FollowingViewProps) {
  const [filterText, setFilterText] = useState('');

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return followedChannels;
    return followedChannels.filter(
      (ch) =>
        ch.title.toLowerCase().includes(q) || ch.handle.toLowerCase().includes(q)
    );
  }, [followedChannels, filterText]);

  return (
    <main className="mx-auto max-w-[1360px] px-3 pb-16 pt-5 sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-4 border-b border-[#E5E3DD] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2.5 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 text-xs font-medium text-[#5C5A55] hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{hasChannelOpen ? 'Back to Channel' : 'Back to Home'}</span>
          </button>

          <h1 className="font-display text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            Followed Channels
          </h1>
          <p className="mt-1 text-sm tabular-nums text-[#5C5A55]">
            {followedChannels.length}{' '}
            {followedChannels.length === 1 ? 'channel' : 'channels'} followed · Tap any channel to
            open its videos
          </p>
        </div>

        {followedChannels.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#73716C]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter followed channels..."
              className="h-10 w-full rounded-lg border border-[#E5E3DD] bg-white pl-8 pr-3 text-xs text-[#111111] placeholder:text-[#73716C] focus:border-[#111111] focus:outline-none sm:h-9"
            />
          </div>
        )}
      </div>

      {followedChannels.length === 0 ? (
        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-[#E5E3DD] bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F7] text-[#111111]">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-semibold text-[#111111]">
            No followed channels yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5C5A55]">
            Search and open any channel, then click <strong>Follow</strong> so it stays saved right
            here for quick 1-click access.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#5C5A55]">
          No followed channels matching &ldquo;{filterText}&rdquo;.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ch) => (
            <div
              key={ch.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[#E5E3DD] bg-white p-4 transition-colors hover:border-[#111111]"
            >
              <button
                type="button"
                onClick={() => onOpenChannel(ch.path)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 text-left"
              >
                {ch.avatar ? (
                  <img
                    src={ch.avatar}
                    alt={ch.title}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 shrink-0 rounded-full border border-[#E5E3DD] bg-[#F2F0EC] object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#111111] font-display text-lg font-bold text-white">
                    {ch.title.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-base font-bold text-[#111111] group-hover:text-[#E11D48]">
                    {ch.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[#5C5A55]">
                    {[ch.handle, ch.subscribersText].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenChannel(ch.path)}
                  aria-label={`Open ${ch.title}`}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#5C5A55] hover:bg-[#FAF9F7] hover:text-[#111111]"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onUnfollow(ch.id)}
                  aria-label={`Unfollow ${ch.title}`}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#73716C] hover:bg-[#FAF9F7] hover:text-[#E11D48]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
