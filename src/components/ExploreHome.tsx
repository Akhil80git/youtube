import { ArrowRight, Heart, Play, Search, Users } from 'lucide-react';
import { useState } from 'react';
import type { FollowedChannel, LikedItem } from '../types';

interface ExploreHomeProps {
  loading: boolean;
  error: string | null;
  likedItems: LikedItem[];
  followedChannels: FollowedChannel[];
  recentChannels: { title: string; handle: string; path: string; avatar: string }[];
  onSubmitChannel: (input: string) => void;
  onOpenFollowing: () => void;
  onOpenLiked: () => void;
  onPlayLikedAll: () => void;
}

const STARTER_CHANNELS = [
  { name: 'Fireship', handle: '@Fireship', note: 'Software & Tech' },
  { name: 'Veritasium', handle: '@veritasium', note: 'Science & Physics' },
  { name: 'Marques Brownlee', handle: '@mkbhd', note: 'Tech Reviews' },
  { name: 'Lofi Girl', handle: '@LofiGirl', note: 'Beats & Music' },
  { name: 'T-Series', handle: '@tseries', note: 'Music & Songs' },
  { name: '3Blue1Brown', handle: '@3blue1brown', note: 'Mathematics' },
];

export function ExploreHome({
  loading,
  error,
  likedItems,
  followedChannels,
  recentChannels,
  onSubmitChannel,
  onOpenFollowing,
  onOpenLiked,
  onPlayLikedAll,
}: ExploreHomeProps) {
  const [heroInput, setHeroInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = heroInput.trim();
    if (!trimmed) return;
    onSubmitChannel(trimmed);
  }

  return (
    <main className="mx-auto max-w-[960px] px-4 py-10 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#111111] sm:text-5xl [text-wrap:balance]">
          Any channel, all videos, zero clutter.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5C5A55] sm:mt-4 sm:text-lg">
          Enter any YouTube channel handle, URL, or name. Follow your favorite channels, like
          tracks to build an auto-playing playlist, and watch right here — free, with no API keys.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73716C]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={heroInput}
            onChange={(e) => setHeroInput(e.target.value)}
            placeholder="Try @LofiGirl, @tseries, or youtube.com/@Fireship..."
            aria-label="Enter YouTube channel"
            className="h-12 w-full rounded-xl border border-[#D8D5CE] bg-white pl-11 pr-4 text-sm text-[#111111] placeholder:text-[#73716C] transition-colors focus:border-[#111111] focus:outline-none sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !heroInput.trim()}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111111] px-6 text-sm font-medium text-white transition-colors hover:bg-[#E11D48] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
        >
          <span>{loading ? 'Loading...' : 'Open Channel'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#E11D48]/30 bg-[#E11D48]/5 px-4 py-3 text-sm text-[#BE123C]"
        >
          {error}
        </div>
      )}

      {/* Quick cards for Liked Playlist & Followed Channels */}
      {(likedItems.length > 0 || followedChannels.length > 0) && (
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {likedItems.length > 0 && (
            <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E5E3DD] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E11D48]/10 text-[#E11D48]">
                  <Heart className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-[#111111]">
                    Your Liked Playlist
                  </h2>
                  <p className="text-xs tabular-nums text-[#5C5A55]">
                    {likedItems.length} {likedItems.length === 1 ? 'track' : 'tracks'} · Ready
                    for continuous auto-play
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onPlayLikedAll}
                  className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 text-xs font-medium text-white transition-colors hover:bg-[#BE123C] whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play All</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenLiked}
                  className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-white px-4 text-xs font-medium text-[#111111] transition-colors hover:border-[#111111] whitespace-nowrap"
                >
                  Open Playlist
                </button>
              </div>
            </section>
          )}

          {followedChannels.length > 0 && (
            <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E5E3DD] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111111] text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-[#111111]">
                    Followed Channels
                  </h2>
                  <p className="text-xs tabular-nums text-[#5C5A55]">
                    {followedChannels.length}{' '}
                    {followedChannels.length === 1 ? 'channel' : 'channels'} saved
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenFollowing}
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 text-xs font-medium text-white transition-colors hover:bg-[#E11D48] whitespace-nowrap"
              >
                <span>View Followed Channels</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          )}
        </div>
      )}

      {followedChannels.length > 0 && (
        <section className="mt-10 border-t border-[#E5E3DD] pt-7 sm:mt-12 sm:pt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#111111]">Following</h2>
            <button
              type="button"
              onClick={onOpenFollowing}
              className="cursor-pointer text-xs font-medium text-[#5C5A55] hover:text-[#111111]"
            >
              See all
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {followedChannels.slice(0, 6).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSubmitChannel(ch.path)}
                className="flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border border-[#E5E3DD] bg-white p-3.5 text-left transition-colors hover:border-[#111111]"
              >
                {ch.avatar ? (
                  <img
                    src={ch.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full bg-[#F2F0EC] object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] font-display text-sm font-bold text-white">
                    {ch.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#111111]">{ch.title}</div>
                  <div className="truncate text-xs text-[#73716C]">{ch.handle}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentChannels.length > 0 && (
        <section className="mt-10 border-t border-[#E5E3DD] pt-7 sm:mt-12 sm:pt-8">
          <h2 className="font-display text-sm font-semibold text-[#111111]">Recently Viewed</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recentChannels.slice(0, 6).map((ch) => (
              <button
                key={ch.path}
                type="button"
                onClick={() => onSubmitChannel(ch.path)}
                className="flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border border-[#E5E3DD] bg-white p-3.5 text-left transition-colors hover:border-[#111111]"
              >
                {ch.avatar ? (
                  <img
                    src={ch.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full bg-[#F2F0EC] object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] font-display text-sm font-bold text-white">
                    {ch.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#111111]">{ch.title}</div>
                  <div className="truncate text-xs text-[#73716C]">{ch.handle}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 border-t border-[#E5E3DD] pt-7 sm:mt-12 sm:pt-8">
        <h2 className="font-display text-sm font-semibold text-[#111111]">Quick Start Channels</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {STARTER_CHANNELS.map((ch) => (
            <button
              key={ch.handle}
              type="button"
              onClick={() => onSubmitChannel(ch.handle)}
              className="group flex min-h-[60px] cursor-pointer items-center justify-between rounded-xl border border-[#E5E3DD] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#111111]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#111111] group-hover:text-[#E11D48]">
                  {ch.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-[#73716C]">
                  {ch.handle} · {ch.note}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#73716C] transition-transform group-hover:translate-x-0.5 group-hover:text-[#111111]" />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
