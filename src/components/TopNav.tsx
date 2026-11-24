import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Heart,
  KeyRound,
  Mic,
  MicOff,
  Play,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem, SearchVideosResponse } from '../types';
import { safeFetchJson } from '../utils/api';
import { PWAInstallButton } from './PWAInstallButton';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface TopNavProps {
  query: string;
  loading: boolean;
  likedCount: number;
  followedCount: number;
  activeView: 'explore' | 'feed' | 'search' | 'channel' | 'following' | 'liked';
  recentSearches: string[];
  hasActivePin?: boolean;
  isKidsTab?: boolean;
  onSubmitSearch: (input: string) => void;
  onSelectVideoFromDropdown: (video: MediaItem, suggestions: MediaItem[], queryText: string) => void;
  onRemoveRecentSearch: (q: string) => void;
  onClearRecentSearches: () => void;
  onOpenPasswordManager: () => void;
  onOpenFollowing: () => void;
  onOpenLiked: () => void;
  onResetHome: () => void;
}

export function TopNav({
  query,
  loading,
  likedCount,
  followedCount,
  activeView,
  recentSearches,
  hasActivePin = false,
  isKidsTab = false,
  onSubmitSearch,
  onSelectVideoFromDropdown,
  onRemoveRecentSearch,
  onClearRecentSearches,
  onOpenPasswordManager,
  onOpenFollowing,
  onOpenLiked,
  onResetHome,
}: TopNavProps) {
  const [input, setInput] = useState(query);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [videoSuggestions, setVideoSuggestions] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = input.trim();
    if (!searchExpanded || trimmed.length < 2) {
      setVideoSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await safeFetchJson<SearchVideosResponse>(
          `/api/search-videos?q=${encodeURIComponent(trimmed)}&channels=0`,
          { signal: controller.signal }
        );
        setVideoSuggestions((data.videos || []).slice(0, 8));
      } catch {
        // Ignore aborted or network search errors in autocomplete
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, searchExpanded]);

  function expandSearch() {
    setSearchExpanded(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function handleVoiceSearch() {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceUnsupported(true);
      setTimeout(() => setVoiceUnsupported(false), 3000);
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = navigator.language || 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;
      setSearchExpanded(true);
      setIsListening(true);

      recognition.onresult = (event) => {
        let transcript = '';
        let hasFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res?.[0]?.transcript) {
            transcript += res[0].transcript;
          }
          if (res?.isFinal) hasFinal = true;
        }
        const cleaned = transcript.trim();
        if (cleaned) {
          setInput(cleaned);
          if (hasFinal) {
            setIsListening(false);
            setSearchExpanded(false);
            inputRef.current?.blur();
            onSubmitSearch(cleaned);
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setSearchExpanded(false);
    inputRef.current?.blur();
    onSubmitSearch(trimmed);
  }

  function handleSelectHistoryQuery(term: string) {
    setInput(term);
    setSearchExpanded(false);
    inputRef.current?.blur();
    onSubmitSearch(term);
  }

  function handleSelectVideo(vid: MediaItem) {
    setSearchExpanded(false);
    inputRef.current?.blur();
    onSelectVideoFromDropdown(vid, videoSuggestions, input.trim());
  }

  const trimmedInput = input.trim();
  const filteredRecent = trimmedInput
    ? recentSearches.filter((term) => term.toLowerCase().includes(trimmedInput.toLowerCase()))
    : recentSearches;

  const showDropdown =
    searchExpanded &&
    (trimmedInput.length >= 2 || (trimmedInput.length === 0 && filteredRecent.length > 0));

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E3DD] bg-white/95 backdrop-blur-md lg:pl-60 xl:pl-64">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        <div className="flex h-11 items-center justify-between gap-2 sm:h-12 sm:gap-4">
          {/* Brand Logo (shown on mobile/tablet; laptop displays logo in vertical sidebar) */}
          <button
            type="button"
            onClick={onResetHome}
            className={`font-display shrink-0 cursor-pointer items-center gap-1.5 text-base font-bold tracking-tight text-[#111111] transition-colors hover:text-[#E11D48] sm:text-lg whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48] lg:hidden ${
              searchExpanded ? 'hidden sm:inline-flex' : 'inline-flex'
            }`}
          >
            <span className="inline-flex h-5 w-6 items-center justify-center rounded-md bg-[#E11D48] text-white sm:h-6 sm:w-7">
              <Play className="h-3 w-3 translate-x-[0.5px] fill-current" />
            </span>
            <span>youtube</span>
          </button>

          {/* Expandable Search Bar (Videos, Songs, Reels — Not Channels) */}
          <div
            ref={containerRef}
            className={`relative transition-all duration-200 ${
              searchExpanded
                ? 'flex-1 sm:max-w-xl lg:max-w-2xl'
                : 'w-28 xs:w-36 sm:w-52 md:w-64 lg:w-full lg:max-w-lg'
            }`}
          >
            {!searchExpanded ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={expandSearch}
                  aria-label="Search videos and songs"
                  className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] px-2.5 text-left text-xs text-[#73716C] transition-colors hover:border-[#111111] hover:bg-white sm:h-9 sm:px-3 sm:text-sm"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#73716C]" aria-hidden="true" />
                  <span className="truncate">{trimmedInput ? trimmedInput : 'Search...'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title="Voice search"
                  aria-label="Voice search by speaking"
                  className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 ${
                    isListening
                      ? 'animate-pulse border-[#E11D48] bg-[#E11D48] text-white'
                      : 'border-[#E5E3DD] bg-[#FAF9F7] text-[#111111] hover:border-[#111111] hover:bg-white'
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setSearchExpanded(false)}
                  aria-label="Collapse search"
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-white text-[#5C5A55] hover:border-[#111111] hover:text-[#111111] sm:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#73716C]"
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onFocus={() => setSearchExpanded(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setSearchExpanded(false);
                    }}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? 'Listening... speak now' : 'Search videos, songs, reels...'}
                    aria-label="Search videos, songs, or reels"
                    className="h-8 w-full rounded-lg border border-[#111111] bg-white pl-8 pr-8 text-sm text-[#111111] placeholder:text-[#73716C] focus:outline-none sm:h-9"
                  />
                  {input && (
                    <button
                      type="button"
                      onClick={() => {
                        setInput('');
                        setVideoSuggestions([]);
                        inputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#73716C] hover:bg-[#E5E3DD]/60 hover:text-[#111111]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title={isListening ? 'Stop listening' : 'Speak to search'}
                  aria-label={isListening ? 'Stop voice search' : 'Speak to search'}
                  className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 ${
                    isListening
                      ? 'animate-pulse border-[#E11D48] bg-[#E11D48] text-white'
                      : 'border-[#E5E3DD] bg-[#FAF9F7] text-[#111111] hover:border-[#111111] hover:bg-white'
                  }`}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="submit"
                  disabled={loading || !trimmedInput}
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#111111] px-3 text-xs font-medium text-white transition-colors hover:bg-[#E11D48] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:text-sm whitespace-nowrap"
                >
                  {loading ? '...' : 'Go'}
                </button>
              </form>
            )}

            {voiceUnsupported && (
              <div className="absolute left-0 top-10 z-50 rounded-lg border border-[#E5E3DD] bg-[#111111] px-3 py-1.5 text-[11px] font-medium text-white shadow-md">
                Voice search not supported in this browser
              </div>
            )}

            {showDropdown && (
              <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-xl border border-[#E5E3DD] bg-white shadow-lg">
                {/* Real Search History when clicked */}
                {trimmedInput.length === 0 && filteredRecent.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-[#F2F0EC] px-3.5 py-2">
                      <span className="text-xs font-medium text-[#73716C]">Recent Searches</span>
                      <button
                        type="button"
                        onClick={onClearRecentSearches}
                        className="cursor-pointer text-[11px] font-medium text-[#73716C] hover:text-[#E11D48]"
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="max-h-72 divide-y divide-[#F2F0EC] overflow-y-auto">
                      {filteredRecent.map((term) => (
                        <li key={term} className="flex items-center hover:bg-[#FAF9F7]">
                          <button
                            type="button"
                            onClick={() => handleSelectHistoryQuery(term)}
                            className="flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#73716C]" />
                            <span className="truncate text-sm font-medium text-[#111111]">
                              {term}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveRecentSearch(term);
                            }}
                            aria-label={`Remove ${term} from search history`}
                            className="mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-[#73716C] hover:bg-[#EAE7E1] hover:text-[#111111]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Live Video & Song Suggestions */}
                {trimmedInput.length >= 2 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchExpanded(false);
                        inputRef.current?.blur();
                        onSubmitSearch(trimmedInput);
                      }}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 border-b border-[#F2F0EC] bg-[#FAF9F7] px-3.5 py-2.5 text-left text-xs font-semibold text-[#111111] transition-colors hover:bg-[#F2F0EC]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Search className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                        <span className="truncate">
                          Search all videos & songs for &ldquo;{trimmedInput}&rdquo;
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#73716C]" />
                    </button>

                    {searching && videoSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#73716C]">
                        Finding videos & songs...
                      </div>
                    ) : videoSuggestions.length > 0 ? (
                      <ul className="max-h-80 divide-y divide-[#F2F0EC] overflow-y-auto">
                        {videoSuggestions.map((vid) => (
                          <li key={vid.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectVideo(vid)}
                              className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-[#FAF9F7]"
                            >
                              <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-[#EAE7E1]">
                                {vid.thumbnail ? (
                                  <img
                                    src={vid.thumbnail}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[#111111] text-white">
                                    <Play className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-[#111111]">
                                  {vid.title}
                                </div>
                                <div className="truncate text-xs text-[#73716C]">
                                  {[vid.channelTitle, vid.duration, vid.viewsText]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </div>
                              </div>
                              <Play className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Password PIN icon + PWA Install + Mobile Icon Actions */}
          <div
            className={`shrink-0 items-center gap-1.5 sm:gap-2 ${
              searchExpanded ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <button
              type="button"
              onClick={onOpenPasswordManager}
              title={
                isKidsTab
                  ? hasActivePin
                    ? 'Change or reset Kids Screen Lock PIN'
                    : 'Set Kids Screen Lock PIN beforehand'
                  : hasActivePin
                    ? 'Change or reset Tab PIN'
                    : 'Set Tab PIN password'
              }
              aria-label="Set or reset PIN password"
              className={`relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${
                hasActivePin
                  ? 'border-[#111111] bg-[#111111] text-white hover:bg-[#E11D48] hover:border-[#E11D48]'
                  : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#111111]'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {hasActivePin && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#E11D48] ring-2 ring-white" />
              )}
            </button>

            <PWAInstallButton variant="compact" />

            <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
              <button
                type="button"
                onClick={onOpenFollowing}
                title={`Following (${followedCount})`}
                aria-label={`Followed channels (${followedCount})`}
                className={`relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${
                  activeView === 'following'
                    ? 'border-[#111111] bg-[#111111] text-white'
                    : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#111111]'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                {followedCount > 0 && (
                  <span
                    className={`absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold leading-none tabular-nums ${
                      activeView === 'following'
                        ? 'bg-[#E11D48] text-white'
                        : 'bg-[#111111] text-white'
                    }`}
                  >
                    {followedCount > 99 ? '99+' : followedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenLiked}
                title={`Liked (${likedCount})`}
                aria-label={`Open Liked Playlist (${likedCount} items)`}
                className={`relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${
                  activeView === 'liked'
                    ? 'border-[#E11D48] bg-[#E11D48] text-white'
                    : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#111111]'
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${
                    activeView === 'liked' || likedCount > 0 ? 'fill-current' : ''
                  } ${activeView !== 'liked' && likedCount > 0 ? 'text-[#E11D48]' : ''}`}
                />
                {likedCount > 0 && (
                  <span
                    className={`absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold leading-none tabular-nums ${
                      activeView === 'liked'
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#E11D48] text-white'
                    }`}
                  >
                    {likedCount > 99 ? '99+' : likedCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
