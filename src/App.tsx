import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChannelView } from './components/ChannelView';
import { ExploreHome } from './components/ExploreHome';
import { FeedView } from './components/FeedView';
import { FollowingView } from './components/FollowingView';
import { LikedPlaylistView } from './components/LikedPlaylistView';
import { RotatedFullPlayer } from './components/RotatedFullPlayer';
import { SearchResultsView } from './components/SearchResultsView';
import { TopNav } from './components/TopNav';
import type {
  ChannelAbout,
  ChannelInfo,
  ChannelSearchResult,
  ChannelTab,
  ChannelTabResponse,
  ContinuationInfo,
  FeedResponse,
  FollowedChannel,
  LikedItem,
  MediaItem,
  PlaylistCard,
  PlaylistDetailResponse,
  SearchVideosResponse,
} from './types';

interface RecentChannel {
  title: string;
  handle: string;
  path: string;
  avatar: string;
}

const RECENT_STORAGE_KEY = 'channelplay_recent_channels';
const RECENT_SEARCHES_STORAGE_KEY = 'channelplay_recent_searches';
const LIKED_STORAGE_KEY = 'channelplay_liked_items';
const FOLLOWED_STORAGE_KEY = 'channelplay_followed_channels';
const WATCH_HISTORY_STORAGE_KEY = 'channelplay_watch_history';

function cleanSeedPhrase(raw: string): string {
  const cleaned = raw
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/\b(official|video|audio|lyrics?|full\s+song|4k|hd|music\s+video|live|shorts?)\b/gi, ' ')
    .replace(/[|•/—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter((w) => w.length > 1).slice(0, 5);
  return words.join(' ').trim();
}

function deriveFeedSeeds(
  watchHistory: MediaItem[],
  likedItems: LikedItem[],
  followedChannels: FollowedChannel[],
  recentChannels: RecentChannel[]
): { seeds: string[]; personalized: boolean } {
  const seeds: string[] = [];
  const seen = new Set<string>();

  const pushSeed = (candidate: string) => {
    const trimmed = candidate.trim();
    const key = trimmed.toLowerCase();
    if (trimmed.length < 2 || seen.has(key)) return;
    seen.add(key);
    seeds.push(trimmed);
  };

  // Mix recent watched video themes & liked songs/videos
  for (const item of watchHistory.slice(0, 4)) {
    const phrase = cleanSeedPhrase(item.title);
    if (phrase) pushSeed(phrase);
    if (item.channelTitle) pushSeed(item.channelTitle);
  }

  for (const item of likedItems.slice(0, 4)) {
    const phrase = cleanSeedPhrase(item.title);
    if (phrase) pushSeed(phrase);
    if (item.channelTitle) pushSeed(item.channelTitle);
  }

  for (const ch of followedChannels.slice(0, 3)) {
    pushSeed(ch.title);
  }

  for (const ch of recentChannels.slice(0, 2)) {
    pushSeed(ch.title);
  }

  return {
    seeds: seeds.slice(0, 6),
    personalized: seeds.length > 0,
  };
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<
    'explore' | 'feed' | 'search' | 'channel' | 'following' | 'liked'
  >('explore');

  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [activeTab, setActiveTab] = useState<ChannelTab>('videos');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistCard[]>([]);
  const [about, setAbout] = useState<ChannelAbout | null>(null);
  const [continuation, setContinuation] = useState<ContinuationInfo | null>(null);

  const [loadingChannel, setLoadingChannel] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const stopLoadAllRef = useRef(false);

  const [error, setError] = useState<string | null>(null);

  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [playerQueue, setPlayerQueue] = useState<MediaItem[]>([]);
  const [playingLikedQueue, setPlayingLikedQueue] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<{
    item: MediaItem;
    initialRotation: 0 | 90 | 180 | 270;
  } | null>(null);

  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [loopQueue, setLoopQueue] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState(false);

  const [activePlaylist, setActivePlaylist] = useState<PlaylistDetailResponse | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const [recentChannels, setRecentChannels] = useState<RecentChannel[]>(() =>
    loadStorage<RecentChannel[]>(RECENT_STORAGE_KEY, [])
  );
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    loadStorage<string[]>(RECENT_SEARCHES_STORAGE_KEY, [])
  );
  const [likedItems, setLikedItems] = useState<LikedItem[]>(() =>
    loadStorage<LikedItem[]>(LIKED_STORAGE_KEY, [])
  );
  const [followedChannels, setFollowedChannels] = useState<FollowedChannel[]>(() =>
    loadStorage<FollowedChannel[]>(FOLLOWED_STORAGE_KEY, [])
  );
  const [watchHistory, setWatchHistory] = useState<MediaItem[]>(() =>
    loadStorage<MediaItem[]>(WATCH_HISTORY_STORAGE_KEY, [])
  );

  const [feedItems, setFeedItems] = useState<MediaItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [activeFeedSeed, setActiveFeedSeed] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchVideosList, setSearchVideosList] = useState<MediaItem[]>([]);
  const [searchChannelsList, setSearchChannelsList] = useState<ChannelSearchResult[]>([]);
  const [searchContinuation, setSearchContinuation] = useState<ContinuationInfo | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [
        clean,
        ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, 12);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
      return next;
    });
  }, []);

  const handleRemoveRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== term);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
      return next;
    });
  }, []);

  const handleClearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const feedSeedInfo = useMemo(
    () => deriveFeedSeeds(watchHistory, likedItems, followedChannels, recentChannels),
    [watchHistory, likedItems, followedChannels, recentChannels]
  );

  const recordWatch = useCallback(
    (item: MediaItem) => {
      const tagged: MediaItem = {
        ...item,
        channelTitle: item.channelTitle || channel?.title,
        channelPath: item.channelPath || channel?.path,
      };
      setWatchHistory((prev) => {
        const next = [tagged, ...prev.filter((w) => w.id !== item.id)].slice(0, 30);
        try {
          localStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota issues
        }
        return next;
      });
    },
    [channel?.title, channel?.path]
  );

  const likedIdSet = useMemo(() => new Set(likedItems.map((l) => l.id)), [likedItems]);
  const followedIdSet = useMemo(
    () => new Set(followedChannels.map((f) => f.id)),
    [followedChannels]
  );

  const isLiked = useCallback((id: string) => likedIdSet.has(id), [likedIdSet]);

  const persistLiked = useCallback((next: LikedItem[]) => {
    try {
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const persistFollowed = useCallback((next: FollowedChannel[]) => {
    try {
      localStorage.setItem(FOLLOWED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const handleToggleLike = useCallback(
    (item: MediaItem) => {
      setLikedItems((prev) => {
        const exists = prev.some((l) => l.id === item.id);
        const next = exists
          ? prev.filter((l) => l.id !== item.id)
          : [
              {
                ...item,
                channelTitle: item.channelTitle || channel?.title || 'YouTube',
                likedAt: Date.now(),
              },
              ...prev,
            ];
        persistLiked(next);
        if (playingLikedQueue) {
          setPlayerQueue(next);
        }
        return next;
      });
    },
    [channel?.title, persistLiked, playingLikedQueue]
  );

  const handleClearLiked = useCallback(() => {
    setLikedItems([]);
    persistLiked([]);
    if (playingLikedQueue) {
      setPlayerQueue([]);
      setPlayingItem(null);
      setExpandedPlayer(null);
    }
  }, [persistLiked, playingLikedQueue]);

  const handleToggleFollow = useCallback(
    (ch: ChannelInfo) => {
      const key = ch.id || ch.path;
      setFollowedChannels((prev) => {
        const exists = prev.some((f) => f.id === key || f.path === ch.path);
        const next = exists
          ? prev.filter((f) => f.id !== key && f.path !== ch.path)
          : [
              {
                id: key,
                title: ch.title,
                handle: ch.handle || ch.path,
                path: ch.path,
                avatar: ch.avatar,
                subscribersText: ch.subscribersText,
                followedAt: Date.now(),
              },
              ...prev,
            ];
        persistFollowed(next);
        return next;
      });
    },
    [persistFollowed]
  );

  const handleUnfollow = useCallback(
    (id: string) => {
      setFollowedChannels((prev) => {
        const next = prev.filter((f) => f.id !== id);
        persistFollowed(next);
        return next;
      });
    },
    [persistFollowed]
  );

  const saveRecentChannel = useCallback((info: ChannelInfo) => {
    setRecentChannels((prev) => {
      const next = [
        {
          title: info.title,
          handle: info.handle || info.path,
          path: info.path,
          avatar: info.avatar,
        },
        ...prev.filter((c) => c.path !== info.path),
      ].slice(0, 8);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
      return next;
    });
  }, []);

  const fetchChannel = useCallback(
    async (channelInput: string, tab: ChannelTab = 'videos', isTabSwitch = false) => {
      stopLoadAllRef.current = true;
      setLoadingAll(false);
      setError(null);
      setActivePlaylist(null);
      setViewMode('channel');

      if (isTabSwitch) {
        setLoadingTab(true);
      } else {
        setLoadingChannel(true);
        setLoadingTab(true);
        setPlayingItem(null);
        setExpandedPlayer(null);
      }

      try {
        const res = await fetch(
          `/api/channel?q=${encodeURIComponent(channelInput)}&tab=${encodeURIComponent(tab)}`
        );
        const data = (await res.json()) as ChannelTabResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Could not load that channel.');
        }

        const taggedItems = (data.items || []).map((it) => ({
          ...it,
          channelTitle: data.channel.title,
        }));

        setChannel(data.channel);
        setActiveTab(data.tab);
        setItems(taggedItems);
        setPlaylists(data.playlists || []);
        setAbout(data.about || null);
        setContinuation(data.continuation || null);
        saveRecentChannel(data.channel);

        window.history.replaceState(null, '', `#${encodeURIComponent(data.channel.path)}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load channel.');
      } finally {
        setLoadingChannel(false);
        setLoadingTab(false);
      }
    },
    [saveRecentChannel]
  );

  const loadFeed = useCallback(
    async (selectedSeed: string | null = activeFeedSeed) => {
      setLoadingFeed(true);
      setFeedError(null);
      try {
        const seedsToUse = selectedSeed ? [selectedSeed] : feedSeedInfo.seeds.slice(0, 4);
        const excludeParam = watchHistory
          .slice(0, 12)
          .map((w) => w.id)
          .join(',');
        const params = new URLSearchParams();
        if (seedsToUse.length > 0) params.set('seeds', seedsToUse.join('||'));
        if (excludeParam) params.set('exclude', excludeParam);

        const res = await fetch(`/api/feed?${params.toString()}`);
        const data = (await res.json()) as FeedResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not load feed.');
        setFeedItems(data.items || []);
      } catch (err) {
        setFeedError(err instanceof Error ? err.message : 'Unable to load feed.');
      } finally {
        setLoadingFeed(false);
      }
    },
    [activeFeedSeed, feedSeedInfo.seeds, watchHistory]
  );

  const openFeedView = useCallback(() => {
    setViewMode('feed');
    window.history.replaceState(null, '', '#feed');
    loadFeed(activeFeedSeed);
  }, [activeFeedSeed, loadFeed]);

  const handleSearchVideos = useCallback(
    async (q: string, autoplayItem?: MediaItem) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setViewMode('search');
      setSearchQuery(trimmed);
      setQuery(trimmed);
      setSearchError(null);
      setLoadingSearch(true);
      saveRecentSearch(trimmed);
      window.history.replaceState(null, '', `#search=${encodeURIComponent(trimmed)}`);

      if (autoplayItem) {
        setPlayingLikedQueue(false);
        setPlayingItem(autoplayItem);
      }

      try {
        const res = await fetch(`/api/search-videos?q=${encodeURIComponent(trimmed)}&channels=0`);
        const data = (await res.json()) as SearchVideosResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not search videos.');

        let finalVideos = data.videos || [];
        if (autoplayItem) {
          finalVideos = [autoplayItem, ...finalVideos.filter((v) => v.id !== autoplayItem.id)];
          setPlayerQueue(finalVideos);
        }

        setSearchVideosList(finalVideos);
        setSearchChannelsList([]);
        setSearchContinuation(data.continuation || null);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Unable to search videos.');
      } finally {
        setLoadingSearch(false);
      }
    },
    [saveRecentSearch]
  );

  async function handleLoadMoreSearch() {
    if (!searchContinuation || loadingMoreSearch) return;
    setLoadingMoreSearch(true);
    try {
      const res = await fetch('/api/search-videos/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continuation: searchContinuation }),
      });
      const data = (await res.json()) as {
        videos?: MediaItem[];
        continuation?: ContinuationInfo | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Failed to load more videos.');

      setSearchVideosList((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const fresh = (data.videos || []).filter((v) => !seen.has(v.id));
        return [...prev, ...fresh];
      });
      setSearchContinuation(data.continuation || null);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to load more videos.');
    } finally {
      setLoadingMoreSearch(false);
    }
  }

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const decoded = decodeURIComponent(hash);
      if (decoded === 'liked') {
        setViewMode('liked');
      } else if (decoded === 'following') {
        setViewMode('following');
      } else if (decoded === 'feed') {
        setViewMode('feed');
        loadFeed(null);
      } else if (decoded.startsWith('search=')) {
        const sq = decoded.slice('search='.length).trim();
        if (sq) handleSearchVideos(sq);
      } else if (decoded.trim()) {
        fetchChannel(decoded, 'videos', false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadMore() {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch('/api/channel/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continuation, tab: activeTab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load more.');

      if (activeTab === 'playlists') {
        setPlaylists((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const fresh = (data.playlists || []).filter((p: PlaylistCard) => !seen.has(p.id));
          return [...prev, ...fresh];
        });
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((v) => v.id));
          const fresh = (data.items || [])
            .filter((v: MediaItem) => !seen.has(v.id))
            .map((v: MediaItem) => ({ ...v, channelTitle: channel?.title }));
          return [...prev, ...fresh];
        });
      }
      setContinuation(data.continuation || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLoadAll() {
    if (!continuation || loadingAll) return;
    stopLoadAllRef.current = false;
    setLoadingAll(true);

    let currentCont: ContinuationInfo | null = continuation;
    let pages = 0;
    const MAX_PAGES = 25;

    try {
      while (currentCont && !stopLoadAllRef.current && pages < MAX_PAGES) {
        pages += 1;
        const res: Response = await fetch('/api/channel/more', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ continuation: currentCont, tab: activeTab }),
        });
        const data = (await res.json()) as {
          items?: MediaItem[];
          playlists?: PlaylistCard[];
          continuation?: ContinuationInfo | null;
        };
        if (!res.ok) break;

        if (activeTab === 'playlists') {
          setPlaylists((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const fresh = (data.playlists || []).filter((p) => !seen.has(p.id));
            return [...prev, ...fresh];
          });
        } else {
          setItems((prev) => {
            const seen = new Set(prev.map((v) => v.id));
            const fresh = (data.items || [])
              .filter((v) => !seen.has(v.id))
              .map((v) => ({ ...v, channelTitle: channel?.title }));
            return [...prev, ...fresh];
          });
        }

        currentCont = data.continuation || null;
        setContinuation(currentCont);
      }
    } finally {
      setLoadingAll(false);
    }
  }

  async function handleOpenPlaylist(playlist: PlaylistCard) {
    setLoadingPlaylist(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlist?list=${encodeURIComponent(playlist.id)}`);
      const data = (await res.json()) as PlaylistDetailResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not load playlist.');
      const taggedVideos = (data.videos || []).map((v) => ({
        ...v,
        channelTitle: v.channelTitle || data.author || channel?.title,
      }));
      setActivePlaylist({ ...data, videos: taggedVideos });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load playlist.');
    } finally {
      setLoadingPlaylist(false);
    }
  }

  // Zero scroll jump! Plays right inside the clicked card.
  function handlePlayItem(item: MediaItem, customQueue?: MediaItem[]) {
    setPlayingLikedQueue(false);
    setPlayingItem(item);
    setPlayerQueue(customQueue || items);
    recordWatch(item);
  }

  function handlePlayLikedTrack(item: MediaItem, shuffle = false) {
    setPlayingLikedQueue(true);
    setAutoPlayNext(true);
    setLoopQueue(true);
    setShuffleQueue(shuffle);
    setPlayingItem(item);
    setPlayerQueue(likedItems);
    recordWatch(item);
  }

  const activeQueue = playerQueue.length > 0 ? playerQueue : items;
  const currentIndex = playingItem ? activeQueue.findIndex((q) => q.id === playingItem.id) : -1;

  const advanceToNext = useCallback(
    (force = false) => {
      if (!force && !autoPlayNext) return;
      if (!playingItem || activeQueue.length === 0) return;

      let nextItem: MediaItem | undefined;
      if (shuffleQueue && activeQueue.length > 1) {
        const candidates = activeQueue.filter((q) => q.id !== playingItem.id);
        nextItem = candidates[Math.floor(Math.random() * candidates.length)];
      } else if (currentIndex >= 0 && currentIndex < activeQueue.length - 1) {
        nextItem = activeQueue[currentIndex + 1];
      } else if (loopQueue) {
        nextItem = activeQueue[0];
      }

      if (nextItem) {
        setPlayingItem(nextItem);
        recordWatch(nextItem);
        if (expandedPlayer) {
          setExpandedPlayer((prev) => (prev ? { ...prev, item: nextItem! } : null));
        }
      }
    },
    [
      autoPlayNext,
      playingItem,
      activeQueue,
      shuffleQueue,
      currentIndex,
      loopQueue,
      expandedPlayer,
      recordWatch,
    ]
  );

  function handleResetHome() {
    stopLoadAllRef.current = true;
    setLoadingAll(false);
    setViewMode('explore');
    setChannel(null);
    setItems([]);
    setPlaylists([]);
    setAbout(null);
    setContinuation(null);
    setActivePlaylist(null);
    setPlayingItem(null);
    setExpandedPlayer(null);
    setQuery('');
    setError(null);
    window.history.replaceState(null, '', '#');
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#111111]">
      <TopNav
        query={query}
        loading={loadingChannel || loadingSearch}
        likedCount={likedItems.length}
        followedCount={followedChannels.length}
        activeView={viewMode}
        recentSearches={recentSearches}
        onSubmitSearch={(input) => handleSearchVideos(input)}
        onSelectVideoFromDropdown={(video, suggestions, qText) => {
          recordWatch(video);
          const merged = [video, ...suggestions.filter((s) => s.id !== video.id)];
          setSearchVideosList(merged);
          setPlayerQueue(merged);
          handleSearchVideos(qText || video.title, video);
        }}
        onRemoveRecentSearch={handleRemoveRecentSearch}
        onClearRecentSearches={handleClearRecentSearches}
        onOpenFeed={openFeedView}
        onOpenFollowing={() => {
          setViewMode('following');
          window.history.replaceState(null, '', '#following');
        }}
        onOpenLiked={() => {
          setViewMode('liked');
          window.history.replaceState(null, '', '#liked');
        }}
        onResetHome={handleResetHome}
      />

      {expandedPlayer && (
        <RotatedFullPlayer
          current={expandedPlayer.item}
          initialRotation={expandedPlayer.initialRotation}
          onEnded={() => advanceToNext(false)}
          onClose={() => setExpandedPlayer(null)}
        />
      )}

      {error && viewMode === 'channel' && channel && (
        <div className="mx-auto max-w-[1360px] px-3 pt-4 sm:px-6">
          <div
            role="alert"
            className="rounded-xl border border-[#E11D48]/30 bg-[#E11D48]/5 px-4 py-3 text-sm text-[#BE123C]"
          >
            {error}
          </div>
        </div>
      )}

      {viewMode === 'search' ? (
        <SearchResultsView
          searchQuery={searchQuery}
          videos={searchVideosList}
          channels={searchChannelsList}
          hasMore={Boolean(searchContinuation)}
          loading={loadingSearch}
          loadingMore={loadingMoreSearch}
          error={searchError}
          playingItem={playingItem}
          hasExpandedPlayer={Boolean(expandedPlayer)}
          hasChannelOpen={Boolean(channel)}
          isLiked={isLiked}
          onPlayItem={handlePlayItem}
          onStopPlay={() => setPlayingItem(null)}
          onEnded={() => advanceToNext(false)}
          onExpandFull={(item, initialRotation) =>
            setExpandedPlayer({ item, initialRotation })
          }
          onToggleLike={handleToggleLike}
          onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
          onLoadMore={handleLoadMoreSearch}
          onBack={() => {
            if (channel) {
              setViewMode('channel');
              window.history.replaceState(null, '', `#${encodeURIComponent(channel.path)}`);
            } else {
              handleResetHome();
            }
          }}
        />
      ) : viewMode === 'feed' ? (
        <FeedView
          items={feedItems}
          seeds={feedSeedInfo.seeds}
          activeSeed={activeFeedSeed}
          personalized={feedSeedInfo.personalized}
          loading={loadingFeed}
          error={feedError}
          playingItem={playingItem}
          hasExpandedPlayer={Boolean(expandedPlayer)}
          hasChannelOpen={Boolean(channel)}
          isLiked={isLiked}
          onSelectSeed={(seed) => {
            setActiveFeedSeed(seed);
            loadFeed(seed);
          }}
          onRefresh={() => loadFeed(activeFeedSeed)}
          onPlayItem={handlePlayItem}
          onStopPlay={() => setPlayingItem(null)}
          onEnded={() => advanceToNext(false)}
          onExpandFull={(item, initialRotation) =>
            setExpandedPlayer({ item, initialRotation })
          }
          onToggleLike={handleToggleLike}
          onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
          onBack={() => {
            if (channel) {
              setViewMode('channel');
              window.history.replaceState(null, '', `#${encodeURIComponent(channel.path)}`);
            } else {
              handleResetHome();
            }
          }}
        />
      ) : viewMode === 'following' ? (
        <FollowingView
          followedChannels={followedChannels}
          hasChannelOpen={Boolean(channel)}
          onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
          onUnfollow={handleUnfollow}
          onBack={() => {
            if (channel) {
              setViewMode('channel');
              window.history.replaceState(null, '', `#${encodeURIComponent(channel.path)}`);
            } else {
              handleResetHome();
            }
          }}
        />
      ) : viewMode === 'liked' ? (
        <LikedPlaylistView
          likedItems={likedItems}
          playingItem={playingItem}
          hasExpandedPlayer={Boolean(expandedPlayer)}
          autoPlayNext={autoPlayNext}
          loopQueue={loopQueue}
          hasChannelOpen={Boolean(channel)}
          onPlayTrack={handlePlayLikedTrack}
          onStopPlay={() => setPlayingItem(null)}
          onEnded={() => advanceToNext(false)}
          onExpandFull={(item, initialRotation) =>
            setExpandedPlayer({ item, initialRotation })
          }
          onToggleAutoPlay={() => setAutoPlayNext((v) => !v)}
          onToggleLoop={() => setLoopQueue((v) => !v)}
          onToggleLike={handleToggleLike}
          onClearAll={handleClearLiked}
          onBack={() => {
            if (channel) {
              setViewMode('channel');
              window.history.replaceState(null, '', `#${encodeURIComponent(channel.path)}`);
            } else {
              handleResetHome();
            }
          }}
        />
      ) : viewMode === 'channel' && channel ? (
        <ChannelView
          channel={channel}
          activeTab={activeTab}
          items={items}
          playlists={playlists}
          about={about}
          hasMore={Boolean(continuation)}
          loadingTab={loadingTab}
          loadingMore={loadingMore}
          loadingAll={loadingAll}
          playingItem={playingItem}
          hasExpandedPlayer={Boolean(expandedPlayer)}
          activePlaylist={activePlaylist}
          loadingPlaylist={loadingPlaylist}
          isFollowed={
            followedIdSet.has(channel.id || channel.path) ||
            followedChannels.some((f) => f.path === channel.path)
          }
          isLiked={isLiked}
          onToggleFollow={handleToggleFollow}
          onToggleLike={handleToggleLike}
          onChangeTab={(tab) => fetchChannel(channel.path, tab, true)}
          onLoadMore={handleLoadMore}
          onLoadAll={handleLoadAll}
          onStopLoadAll={() => {
            stopLoadAllRef.current = true;
          }}
          onPlayItem={handlePlayItem}
          onStopPlay={() => setPlayingItem(null)}
          onEnded={() => advanceToNext(false)}
          onExpandFull={(item, initialRotation) =>
            setExpandedPlayer({ item, initialRotation })
          }
          onOpenPlaylist={handleOpenPlaylist}
          onClosePlaylist={() => setActivePlaylist(null)}
        />
      ) : (
        <ExploreHome
          loading={loadingChannel}
          error={error}
          likedItems={likedItems}
          followedChannels={followedChannels}
          recentChannels={recentChannels}
          onSubmitChannel={(input) => fetchChannel(input, 'videos', false)}
          onOpenFollowing={() => {
            setViewMode('following');
            window.history.replaceState(null, '', '#following');
          }}
          onOpenLiked={() => {
            setViewMode('liked');
            window.history.replaceState(null, '', '#liked');
          }}
          onPlayLikedAll={() => {
            if (likedItems[0]) {
              setViewMode('liked');
              handlePlayLikedTrack(likedItems[0], false);
            }
          }}
        />
      )}
    </div>
  );
}
