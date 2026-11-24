import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Mic,
  MicOff,
  Play,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MediaItem, SearchVideosResponse, ViewMode } from '../types';
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

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface TopNavProps {
  query: string;
  loading: boolean;
  followedCount: number;
  activeView: ViewMode;
  recentSearches: string[];
  onSubmitSearch: (input: string) => void;
  onSelectVideoFromDropdown: (video: MediaItem, suggestions: MediaItem[], queryText: string) => void;
  onRemoveRecentSearch: (q: string) => void;
  onClearRecentSearches: () => void;
  onOpenFollowing: () => void;
  onResetHome: () => void;
}

export function TopNav({
  query,
  loading,
  followedCount,
  activeView,
  recentSearches,
  onSubmitSearch,
  onSelectVideoFromDropdown,
  onRemoveRecentSearch,
  onClearRecentSearches,
  onOpenFollowing,
  onResetHome,
}: TopNavProps) {
  const [input, setInput] = useState(query);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [videoSuggestions, setVideoSuggestions] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<string>('');
  const submittedVoiceRef = useRef<boolean>(false);
  const voiceMsgTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (voiceMsgTimerRef.current) window.clearTimeout(voiceMsgTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isListening) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isListening]);

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

  function showVoiceNotice(msg: string) {
    setVoiceMessage(msg);
    if (voiceMsgTimerRef.current) window.clearTimeout(voiceMsgTimerRef.current);
    voiceMsgTimerRef.current = window.setTimeout(() => {
      setVoiceMessage(null);
    }, 3500);
  }

  function handleVoiceSearch() {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setIsListening(false);
      }
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!Recognition) {
      showVoiceNotice('Voice search requires Chrome, Edge, or Safari.');
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore prior abort error
    }

    try {
      const recognition = new Recognition();
      recognition.lang = navigator.language || 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      transcriptRef.current = '';
      submittedVoiceRef.current = false;
      recognitionRef.current = recognition;
      setVoiceMessage(null);
      setSearchExpanded(true);
      setIsListening(true);

      recognition.onresult = (event) => {
        let transcript = '';
        let hasFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res?.[0]?.transcript) {
            transcript += (transcript ? ' ' : '') + res[0].transcript;
          }
          if (res?.isFinal) hasFinal = true;
        }
        const cleaned = transcript.replace(/\s+/g, ' ').trim();
        if (cleaned) {
          transcriptRef.current = cleaned;
          setInput(cleaned);
          if (hasFinal && !submittedVoiceRef.current) {
            submittedVoiceRef.current = true;
            setIsListening(false);
            setSearchExpanded(false);
            inputRef.current?.blur();
            onSubmitSearch(cleaned);
          }
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const code = event?.error || '';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          showVoiceNotice('Microphone permission blocked. Allow mic access in browser.');
        } else if (code === 'audio-capture') {
          showVoiceNotice('No microphone detected on this device.');
        } else if (code === 'no-speech') {
          showVoiceNotice('No speech detected. Tap mic and speak clearly.');
        } else if (code === 'network') {
          showVoiceNotice('Voice recognition needs an active connection.');
        } else if (code && code !== 'aborted') {
          showVoiceNotice('Voice search could not start. Try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        const pendingText = transcriptRef.current.trim();
        if (pendingText && !submittedVoiceRef.current) {
          submittedVoiceRef.current = true;
          setSearchExpanded(false);
          inputRef.current?.blur();
          onSubmitSearch(pendingText);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
      showVoiceNotice('Unable to start microphone.');
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
    <header className="sticky top-0 z-30 border-b border-[#E5E3DD] bg-white/95 backdrop-blur-md lg:pl-60 xl:pl-64 dark:border-[#27272F] dark:bg-[#141418]/95">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        <div className="flex h-11 items-center justify-between gap-2 sm:h-12 sm:gap-4">
          {/* Brand Logo (mobile/tablet; laptop shows logo in vertical sidebar) */}
          <button
            type="button"
            onClick={onResetHome}
            className={`font-display shrink-0 cursor-pointer items-center gap-1.5 text-base font-bold tracking-tight text-[#111111] transition-colors hover:text-[#E11D48] sm:text-lg whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48] lg:hidden dark:text-[#F4F4F6] ${
              searchExpanded ? 'hidden sm:inline-flex' : 'inline-flex'
            }`}
          >
            <span className="inline-flex h-5 w-6 items-center justify-center rounded-md bg-[#E11D48] text-white sm:h-6 sm:w-7">
              <Play className="h-3 w-3 translate-x-[0.5px] fill-current" />
            </span>
            <span>youtube</span>
          </button>

          {/* Expandable Search Bar + Voice Search */}
          <div
            ref={containerRef}
            className={`relative transition-all duration-200 ${
              searchExpanded
                ? 'flex-1 sm:max-w-xl lg:max-w-2xl'
                : 'w-32 xs:w-40 sm:w-56 md:w-64 lg:w-full lg:max-w-lg'
            }`}
          >
            {!searchExpanded ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={expandSearch}
                  aria-label="Search videos and songs"
                  className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] px-2.5 text-left text-xs text-[#73716C] transition-colors hover:border-[#E11D48] hover:bg-white sm:h-9 sm:px-3 sm:text-sm dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#A1A1AA] dark:hover:bg-[#27272F]"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#73716C] dark:text-[#A1A1AA]" aria-hidden="true" />
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
                      : 'border-[#E5E3DD] bg-[#FAF9F7] text-[#111111] hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#F4F4F6]'
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
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-white text-[#5C5A55] hover:border-[#E11D48] hover:text-[#111111] sm:hidden dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#A1A1AA] dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#73716C] dark:text-[#A1A1AA]"
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
                    placeholder={isListening ? 'Listening... speak now' : 'Search videos and songs...'}
                    aria-label="Search videos and songs"
                    className="h-8 w-full rounded-lg border border-[#E11D48] bg-white pl-8 pr-8 text-sm text-[#111111] placeholder:text-[#73716C] focus:outline-none sm:h-9 dark:border-[#E11D48] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:placeholder:text-[#A1A1AA]"
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
                      className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#73716C] hover:bg-[#E5E3DD]/60 hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#27272F] dark:hover:text-white"
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
                      : 'border-[#E5E3DD] bg-[#FAF9F7] text-[#111111] hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#F4F4F6]'
                  }`}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="submit"
                  disabled={loading || !trimmedInput}
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#E11D48] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:text-sm whitespace-nowrap"
                >
                  {loading ? '...' : 'Go'}
                </button>
              </form>
            )}

            {voiceMessage && (
              <div
                role="status"
                className="absolute left-0 top-10 z-50 rounded-lg border border-[#E11D48]/30 bg-white px-3 py-1.5 text-[11px] font-medium text-[#BE123C] shadow-md dark:border-[#E11D48]/40 dark:bg-[#1E1E24] dark:text-[#FDA4AF]"
              >
                {voiceMessage}
              </div>
            )}

            {showDropdown && (
              <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-xl border border-[#E5E3DD] bg-white shadow-lg dark:border-[#27272F] dark:bg-[#141418]">
                {trimmedInput.length === 0 && filteredRecent.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-[#F2F0EC] px-3.5 py-2 dark:border-[#27272F]">
                      <span className="text-xs font-medium text-[#73716C] dark:text-[#A1A1AA]">
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={onClearRecentSearches}
                        className="cursor-pointer text-[11px] font-medium text-[#73716C] hover:text-[#E11D48] dark:text-[#A1A1AA]"
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="max-h-72 divide-y divide-[#F2F0EC] overflow-y-auto dark:divide-[#27272F]">
                      {filteredRecent.map((term) => (
                        <li
                          key={term}
                          className="flex items-center hover:bg-[#FAF9F7] dark:hover:bg-[#1E1E24]"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectHistoryQuery(term)}
                            className="flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#73716C] dark:text-[#A1A1AA]" />
                            <span className="truncate text-sm font-medium text-[#111111] dark:text-[#F4F4F6]">
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
                            className="mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-[#73716C] hover:bg-[#EAE7E1] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#27272F] dark:hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {trimmedInput.length >= 2 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchExpanded(false);
                        inputRef.current?.blur();
                        onSubmitSearch(trimmedInput);
                      }}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 border-b border-[#F2F0EC] bg-[#FAF9F7] px-3.5 py-2.5 text-left text-xs font-semibold text-[#111111] transition-colors hover:bg-[#F2F0EC] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:hover:bg-[#27272F]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Search className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                        <span className="truncate">
                          Search all videos & songs for &ldquo;{trimmedInput}&rdquo;
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#73716C] dark:text-[#A1A1AA]" />
                    </button>

                    {searching && videoSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#73716C] dark:text-[#A1A1AA]">
                        Finding videos & songs...
                      </div>
                    ) : videoSuggestions.length > 0 ? (
                      <ul className="max-h-80 divide-y divide-[#F2F0EC] overflow-y-auto dark:divide-[#27272F]">
                        {videoSuggestions.map((vid) => (
                          <li key={vid.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectVideo(vid)}
                              className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-[#FAF9F7] dark:hover:bg-[#1E1E24]"
                            >
                              <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-[#EAE7E1] dark:bg-[#27272F]">
                                {vid.thumbnail ? (
                                  <img
                                    src={vid.thumbnail}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[#FFF1F3] text-[#E11D48] dark:bg-[#27272F]">
                                    <Play className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-[#111111] dark:text-[#F4F4F6]">
                                  {vid.title}
                                </div>
                                <div className="truncate text-xs text-[#73716C] dark:text-[#A1A1AA]">
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

          {/* Right Actions: PWA Install + Following (mobile/tablet; Liked moved to BottomNav; Password removed) */}
          <div
            className={`shrink-0 items-center gap-1.5 sm:gap-2 ${
              searchExpanded ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <PWAInstallButton variant="compact" />

            <button
              type="button"
              onClick={onOpenFollowing}
              title={`Following (${followedCount})`}
              aria-label={`Followed channels (${followedCount})`}
              className={`relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] ${
                activeView === 'following'
                  ? 'border-[#E11D48] bg-[#E11D48] text-white'
                  : 'border-[#E5E3DD] bg-white text-[#111111] hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#F4F4F6]'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {followedCount > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold leading-none tabular-nums ${
                    activeView === 'following'
                      ? 'bg-white text-[#E11D48]'
                      : 'bg-[#E11D48] text-white'
                  }`}
                >
                  {followedCount > 99 ? '99+' : followedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
