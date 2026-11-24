import { Search, X, ArrowRight, Clock, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChannelSearchResult } from '../types';

interface TopNavProps {
  query: string;
  loading: boolean;
  likedCount: number;
  viewingLiked: boolean;
  recentChannels: { title: string; handle: string; path: string; avatar: string }[];
  onSubmitChannel: (input: string) => void;
  onOpenLiked: () => void;
  onResetHome: () => void;
}

export function TopNav({
  query,
  loading,
  likedCount,
  viewingLiked,
  recentChannels,
  onSubmitChannel,
  onOpenLiked,
  onResetHome,
}: TopNavProps) {
  const [input, setInput] = useState(query);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<ChannelSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = input.trim();
    if (!focused || trimmed.length < 2 || /^https?:\/\//i.test(trimmed)) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search-channels?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { results?: ChannelSearchResult[] };
          setSuggestions(data.results || []);
        }
      } catch {
        // Ignore aborted or network search errors in autocomplete
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, focused]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setFocused(false);
    onSubmitChannel(trimmed);
  }

  function handleSelectChannel(pathOrHandle: string) {
    setFocused(false);
    onSubmitChannel(pathOrHandle);
  }

  const showDropdown =
    focused &&
    (suggestions.length > 0 ||
      searching ||
      (input.trim().length === 0 && recentChannels.length > 0));

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E3DD] bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1360px] px-3 py-2.5 sm:px-6 sm:py-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:h-16 sm:flex-nowrap sm:gap-6">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={onResetHome}
            className="font-display order-1 shrink-0 cursor-pointer text-lg font-bold tracking-tight text-[#111111] transition-colors hover:text-[#E11D48] sm:text-xl whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]"
          >
            ChannelPlay
          </button>

          {/* Search Input (full row below on mobile, centered on sm+) */}
          <div ref={containerRef} className="relative order-3 w-full sm:order-2 sm:flex-1 sm:max-w-xl">
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73716C]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={input}
                  onFocus={() => setFocused(true)}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Channel @handle, URL, or name..."
                  aria-label="Channel search"
                  className="h-11 w-full rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] pl-9 pr-9 text-sm text-[#111111] placeholder:text-[#73716C] transition-colors focus:border-[#111111] focus:bg-white focus:outline-none sm:h-10"
                />
                {input && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput('');
                      setSuggestions([]);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#73716C] hover:bg-[#E5E3DD]/60 hover:text-[#111111]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#111111] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#E11D48] disabled:cursor-not-allowed disabled:opacity-45 sm:hidden whitespace-nowrap"
              >
                {loading ? '...' : 'Go'}
              </button>
            </form>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-[#E5E3DD] bg-white shadow-lg">
                {input.trim().length === 0 && recentChannels.length > 0 && (
                  <div>
                    <div className="border-b border-[#F2F0EC] px-3.5 py-2 text-xs font-medium text-[#73716C]">
                      Recent Channels
                    </div>
                    <ul className="divide-y divide-[#F2F0EC]">
                      {recentChannels.slice(0, 5).map((ch) => (
                        <li key={ch.path}>
                          <button
                            type="button"
                            onClick={() => handleSelectChannel(ch.path)}
                            className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#FAF9F7]"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#73716C]" />
                            {ch.avatar ? (
                              <img
                                src={ch.avatar}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-7 w-7 shrink-0 rounded-full bg-[#F2F0EC] object-cover"
                              />
                            ) : (
                              <div className="h-7 w-7 shrink-0 rounded-full bg-[#F2F0EC]" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-[#111111]">
                                {ch.title}
                              </div>
                              <div className="truncate text-xs text-[#73716C]">{ch.handle}</div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {input.trim().length >= 2 && (
                  <div>
                    {searching && suggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#73716C]">Finding channels...</div>
                    ) : (
                      <ul className="max-h-72 divide-y divide-[#F2F0EC] overflow-y-auto">
                        {suggestions.map((ch) => (
                          <li key={ch.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectChannel(ch.path)}
                              className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#FAF9F7]"
                            >
                              {ch.avatar ? (
                                <img
                                  src={ch.avatar}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-8 w-8 shrink-0 rounded-full bg-[#F2F0EC] object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 shrink-0 rounded-full bg-[#F2F0EC]" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-[#111111]">
                                  {ch.title}
                                </div>
                                <div className="truncate text-xs text-[#73716C]">
                                  {[ch.handle, ch.subscribersText].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#73716C]" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Liked Playlist + Desktop Load CTA */}
          <div className="order-2 flex shrink-0 items-center gap-2 sm:order-3">
            <button
              type="button"
              onClick={onOpenLiked}
              aria-label={`Open Liked Playlist (${likedCount} items)`}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${
                viewingLiked
                  ? 'border-[#E11D48] bg-[#E11D48] text-white'
                  : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#111111]'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${
                  viewingLiked || likedCount > 0 ? 'fill-current' : ''
                } ${!viewingLiked && likedCount > 0 ? 'text-[#E11D48]' : ''}`}
              />
              <span>Liked</span>
              <span className="font-mono text-xs tabular-nums opacity-85">({likedCount})</span>
            </button>

            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => {
                const trimmed = input.trim();
                if (trimmed) {
                  setFocused(false);
                  onSubmitChannel(trimmed);
                }
              }}
              className="hidden h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#111111] px-4 text-sm font-medium text-white transition-colors hover:bg-[#E11D48] disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
            >
              <span>{loading ? 'Loading...' : 'Load Channel'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
