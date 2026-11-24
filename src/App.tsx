import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { ChannelView } from './components/ChannelView';
import { EdgeSwipeBack } from './components/EdgeSwipeBack';
import { ExploreHome } from './components/ExploreHome';
import { FeedView } from './components/FeedView';
import { FollowingView } from './components/FollowingView';
import { LaptopSidebar } from './components/LaptopSidebar';
import { LikedPlaylistView } from './components/LikedPlaylistView';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PinModal } from './components/PinModal';
import { RotatedFullPlayer } from './components/RotatedFullPlayer';
import { SearchResultsView } from './components/SearchResultsView';
import { TabModal } from './components/TabModal';
import { TopNav } from './components/TopNav';
import type {
  AppTab,
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
  RecentChannel,
  SearchVideosResponse,
  TabDataState,
  ThemeMode,
  ViewMode,
} from './types';
import { safeFetchJson } from './utils/api';

const LEGACY_RECENT_STORAGE_KEY = 'channelplay_recent_channels';
const LEGACY_RECENT_SEARCHES_STORAGE_KEY = 'channelplay_recent_searches';
const LEGACY_LIKED_STORAGE_KEY = 'channelplay_liked_items';
const LEGACY_FOLLOWED_STORAGE_KEY = 'channelplay_followed_channels';
const LEGACY_WATCH_HISTORY_STORAGE_KEY = 'channelplay_watch_history';

const TABS_STORAGE_KEY = 'yt_tabs_v1';
const ACTIVE_TAB_STORAGE_KEY = 'yt_active_tab_id_v1';
const HAS_VISITED_STORAGE_KEY = 'yt_has_visited_v1';
const TAB_DATA_PREFIX = 'yt_tab_data_v1_';
const THEME_STORAGE_KEY = 'yt_theme_v1';
const PREFERRED_MODE_STORAGE_KEY = 'yt_preferred_mode_v1';

interface ExpandedPlayerState {
  item: MediaItem;
  initialRotation: 0 | 90 | 180 | 270;
  startSeconds?: number;
  lockOnOpen?: boolean;
}

interface AppNavSnapshot {
  seq: number;
  hash: string;
  tabId: string;
  viewMode: ViewMode;
  query: string;
  searchQuery: string;
  searchVideosList: MediaItem[];
  searchChannelsList: ChannelSearchResult[];
  searchContinuation: ContinuationInfo | null;
  channel: ChannelInfo | null;
  activeTab: ChannelTab;
  items: MediaItem[];
  playlists: PlaylistCard[];
  about: ChannelAbout | null;
  continuation: ContinuationInfo | null;
  activePlaylist: PlaylistDetailResponse | null;
  playingItem: MediaItem | null;
  playerQueue: MediaItem[];
  playingLikedQueue: boolean;
  expandedPlayer: ExpandedPlayerState | null;
}

const DEFAULT_TABS: AppTab[] = [
  { id: 'main', name: 'Main', kind: 'default' },
  { id: 'kids', name: 'Kids', kind: 'kids' },
];

const KIDS_DEFAULT_SEEDS = [
  'kids cartoons nursery rhymes',
  'learning videos for kids',
  'moral stories for kids',
  'kids songs animation',
];

function loadPreferredMode(): 'videos' | 'music' {
  try {
    return localStorage.getItem(PREFERRED_MODE_STORAGE_KEY) === 'music' ? 'music' : 'videos';
  } catch {
    return 'videos';
  }
}

function createEmptyTabData(): TabDataState {
  return {
    appMode: loadPreferredMode(),
    recentChannels: [],
    recentSearches: [],
    likedItems: [],
    followedChannels: [],
    watchHistory: [],
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

function saveStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues
  }
}

function loadInitialTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function loadInitialTabs(): AppTab[] {
  const stored = loadStorage<AppTab[]>(TABS_STORAGE_KEY, []);
  if (!Array.isArray(stored) || stored.length === 0) {
    saveStorage(TABS_STORAGE_KEY, DEFAULT_TABS);
    return DEFAULT_TABS;
  }

  const hasMain = stored.some((t) => t.id === 'main');
  const hasKids = stored.some((t) => t.id === 'kids');
  // Passwords belong ONLY on the Kids tab (strip any legacy PINs from other tabs)
  const normalized = stored.map((t) => {
    if (t.kind === 'kids') return t;
    const { pin: _removed, ...rest } = t;
    return rest;
  });
  if (!hasMain) normalized.unshift(DEFAULT_TABS[0]);
  if (!hasKids) {
    const mainIdx = normalized.findIndex((t) => t.id === 'main');
    normalized.splice(mainIdx >= 0 ? mainIdx + 1 : 0, 0, DEFAULT_TABS[1]);
  }
  return normalized;
}

function loadTabData(tabId: string): TabDataState {
  const key = `${TAB_DATA_PREFIX}${tabId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TabDataState>;
      return {
        appMode: parsed.appMode === 'music' ? 'music' : 'videos',
        recentChannels: Array.isArray(parsed.recentChannels) ? parsed.recentChannels : [],
        recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
        likedItems: Array.isArray(parsed.likedItems) ? parsed.likedItems : [],
        followedChannels: Array.isArray(parsed.followedChannels) ? parsed.followedChannels : [],
        watchHistory: Array.isArray(parsed.watchHistory) ? parsed.watchHistory : [],
      };
    }
  } catch {
    // Ignore parse error
  }

  // One-time migration of legacy single-user storage into the Main tab
  if (tabId === 'main') {
    const migrated: TabDataState = {
      appMode: 'videos',
      recentChannels: loadStorage<RecentChannel[]>(LEGACY_RECENT_STORAGE_KEY, []),
      recentSearches: loadStorage<string[]>(LEGACY_RECENT_SEARCHES_STORAGE_KEY, []),
      likedItems: loadStorage<LikedItem[]>(LEGACY_LIKED_STORAGE_KEY, []),
      followedChannels: loadStorage<FollowedChannel[]>(LEGACY_FOLLOWED_STORAGE_KEY, []),
      watchHistory: loadStorage<MediaItem[]>(LEGACY_WATCH_HISTORY_STORAGE_KEY, []),
    };
    saveStorage(key, migrated);
    return migrated;
  }

  const empty = createEmptyTabData();
  saveStorage(key, empty);
  return empty;
}

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
  tab: AppTab,
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

  const hasPersonalHistory = seeds.length > 0;

  if (tab.kind === 'kids' && seeds.length < 2) {
    for (const kidSeed of KIDS_DEFAULT_SEEDS) {
      pushSeed(kidSeed);
    }
  } else if (tab.kind === 'custom' && seeds.length === 0) {
    pushSeed(tab.name);
    pushSeed(`${tab.name} trending`);
    pushSeed(`${tab.name} playlist`);
  }

  return {
    seeds: seeds.slice(0, 6),
    personalized: hasPersonalHistory,
  };
}

export default function App() {
  const [tabs, setTabs] = useState<AppTab[]>(() => loadInitialTabs());
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const initialTabs = loadInitialTabs();
    const savedId =
      typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) : null;
    if (savedId && initialTabs.some((t) => t.id === savedId)) {
      return savedId;
    }
    return initialTabs[0]?.id || 'main';
  });

  const [tabDataMap, setTabDataMap] = useState<Record<string, TabDataState>>(() => {
    const initialTabs = loadInitialTabs();
    const savedId =
      typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) : null;
    const startId =
      savedId && initialTabs.some((t) => t.id === savedId)
        ? savedId
        : initialTabs[0]?.id || 'main';
    return {
      [startId]: loadTabData(startId),
    };
  });

  const [theme, setTheme] = useState<ThemeMode>(() => loadInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage error
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0B0B0D' : '#FAF9F7');
    }
  }, [theme]);

  const [preferredMode, setPreferredMode] = useState<'videos' | 'music'>(() =>
    loadPreferredMode()
  );

  // Modal states (password setup is Kids-only)
  const [tabModalState, setTabModalState] = useState<{
    mode: 'create' | 'edit';
    tab?: AppTab;
  } | null>(null);
  const [kidsPasswordOpen, setKidsPasswordOpen] = useState(false);

  const currentTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0] || DEFAULT_TABS[0],
    [tabs, activeTabId]
  );

  const currentTabData = useMemo(
    () => tabDataMap[activeTabId] || loadTabData(activeTabId),
    [tabDataMap, activeTabId]
  );

  const appMode = preferredMode;
  const recentChannels = currentTabData.recentChannels;
  const recentSearches = currentTabData.recentSearches;
  const likedItems = currentTabData.likedItems;
  const followedChannels = currentTabData.followedChannels;
  const watchHistory = currentTabData.watchHistory;

  const updateTabData = useCallback(
    (tabId: string, updater: (prev: TabDataState) => TabDataState) => {
      setTabDataMap((prev) => {
        const base = prev[tabId] || loadTabData(tabId);
        const next = updater(base);
        saveStorage(`${TAB_DATA_PREFIX}${tabId}`, next);
        return { ...prev, [tabId]: next };
      });
    },
    []
  );

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('explore');

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
  const [playerStartSeconds, setPlayerStartSeconds] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );
  const [expandedPlayer, setExpandedPlayer] = useState<ExpandedPlayerState | null>(null);
  const kidsScreenLockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [loopQueue, setLoopQueue] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState(false);

  const [activePlaylist, setActivePlaylist] = useState<PlaylistDetailResponse | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

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

  // Native Mobile Back (3-button / OS gesture) + Edge Swipe History Stack
  const navCacheRef = useRef<Map<number, AppNavSnapshot>>(new Map());
  const seqCounterRef = useRef(0);
  const currentSeqRef = useRef(0);
  const minSeqRef = useRef(0);
  const [canGoBack, setCanGoBack] = useState(false);

  const latestNavStateRef = useRef<Omit<AppNavSnapshot, 'seq'>>({
    hash: '#',
    tabId: activeTabId,
    viewMode,
    query,
    searchQuery,
    searchVideosList,
    searchChannelsList,
    searchContinuation,
    channel,
    activeTab,
    items,
    playlists,
    about,
    continuation,
    activePlaylist,
    playingItem,
    playerQueue,
    playingLikedQueue,
    expandedPlayer,
  });

  latestNavStateRef.current = {
    hash: window.location.hash || '#',
    tabId: activeTabId,
    viewMode,
    query,
    searchQuery,
    searchVideosList,
    searchChannelsList,
    searchContinuation,
    channel,
    activeTab,
    items,
    playlists,
    about,
    continuation,
    activePlaylist,
    playingItem,
    playerQueue,
    playingLikedQueue,
    expandedPlayer,
  };

  const storeSnapshot = useCallback(
    (seq: number, hash: string, overrides?: Partial<Omit<AppNavSnapshot, 'seq' | 'hash'>>) => {
      const snap: AppNavSnapshot = {
        ...latestNavStateRef.current,
        ...overrides,
        seq,
        hash,
      };
      navCacheRef.current.set(seq, snap);
      if (navCacheRef.current.size > 25) {
        for (const key of navCacheRef.current.keys()) {
          if (key !== minSeqRef.current && key !== seq && navCacheRef.current.size > 25) {
            navCacheRef.current.delete(key);
          }
        }
      }
      return snap;
    },
    []
  );

  const commitNavigation = useCallback(
    (
      hash: string,
      overrides?: Partial<Omit<AppNavSnapshot, 'seq' | 'hash'>>,
      mode: 'push' | 'replace' = 'push'
    ) => {
      if (mode === 'push') {
        // Save most recent state of current entry before moving forward
        storeSnapshot(currentSeqRef.current, latestNavStateRef.current.hash);
        const nextSeq = seqCounterRef.current + 1;
        seqCounterRef.current = nextSeq;
        currentSeqRef.current = nextSeq;
        storeSnapshot(nextSeq, hash, overrides);
        window.history.pushState({ __ytNav: true, seq: nextSeq }, '', hash);
        setCanGoBack(nextSeq > minSeqRef.current);
        return nextSeq;
      }

      const seq = currentSeqRef.current;
      storeSnapshot(seq, hash, overrides);
      window.history.replaceState({ __ytNav: true, seq }, '', hash);
      setCanGoBack(seq > minSeqRef.current);
      return seq;
    },
    [storeSnapshot]
  );

  const saveRecentSearch = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) return;
      updateTabData(activeTabId, (prev) => ({
        ...prev,
        recentSearches: [
          clean,
          ...prev.recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
        ].slice(0, 12),
      }));
    },
    [activeTabId, updateTabData]
  );

  const handleRemoveRecentSearch = useCallback(
    (term: string) => {
      updateTabData(activeTabId, (prev) => ({
        ...prev,
        recentSearches: prev.recentSearches.filter((item) => item !== term),
      }));
    },
    [activeTabId, updateTabData]
  );

  const handleClearRecentSearches = useCallback(() => {
    updateTabData(activeTabId, (prev) => ({
      ...prev,
      recentSearches: [],
    }));
  }, [activeTabId, updateTabData]);

  const feedSeedInfo = useMemo(
    () =>
      deriveFeedSeeds(
        currentTab,
        watchHistory,
        likedItems,
        followedChannels,
        recentChannels
      ),
    [currentTab, watchHistory, likedItems, followedChannels, recentChannels]
  );

  const recordWatch = useCallback(
    (item: MediaItem) => {
      const tagged: MediaItem = {
        ...item,
        channelTitle: item.channelTitle || channel?.title,
        channelPath: item.channelPath || channel?.path,
      };
      updateTabData(activeTabId, (prev) => ({
        ...prev,
        watchHistory: [tagged, ...prev.watchHistory.filter((w) => w.id !== item.id)].slice(0, 30),
      }));
    },
    [activeTabId, channel?.path, channel?.title, updateTabData]
  );

  const likedIdSet = useMemo(() => new Set(likedItems.map((l) => l.id)), [likedItems]);
  const followedIdSet = useMemo(
    () => new Set(followedChannels.map((f) => f.id)),
    [followedChannels]
  );

  const isLiked = useCallback((id: string) => likedIdSet.has(id), [likedIdSet]);

  const handleToggleLike = useCallback(
    (item: MediaItem) => {
      updateTabData(activeTabId, (prev) => {
        const exists = prev.likedItems.some((l) => l.id === item.id);
        const nextLiked = exists
          ? prev.likedItems.filter((l) => l.id !== item.id)
          : [
              {
                ...item,
                channelTitle: item.channelTitle || channel?.title || 'YouTube',
                likedAt: Date.now(),
              },
              ...prev.likedItems,
            ];
        if (playingLikedQueue) {
          setPlayerQueue(nextLiked);
        }
        return { ...prev, likedItems: nextLiked };
      });
    },
    [activeTabId, channel?.title, playingLikedQueue, updateTabData]
  );

  const handleClearLiked = useCallback(() => {
    updateTabData(activeTabId, (prev) => ({ ...prev, likedItems: [] }));
    if (playingLikedQueue) {
      setPlayerQueue([]);
      setPlayingItem(null);
      setExpandedPlayer(null);
    }
  }, [activeTabId, playingLikedQueue, updateTabData]);

  const handleToggleFollow = useCallback(
    (ch: ChannelInfo) => {
      const key = ch.id || ch.path;
      updateTabData(activeTabId, (prev) => {
        const exists = prev.followedChannels.some(
          (f) => f.id === key || f.path === ch.path
        );
        const nextFollowed = exists
          ? prev.followedChannels.filter((f) => f.id !== key && f.path !== ch.path)
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
              ...prev.followedChannels,
            ];
        return { ...prev, followedChannels: nextFollowed };
      });
    },
    [activeTabId, updateTabData]
  );

  const handleUnfollow = useCallback(
    (id: string) => {
      updateTabData(activeTabId, (prev) => ({
        ...prev,
        followedChannels: prev.followedChannels.filter((f) => f.id !== id),
      }));
    },
    [activeTabId, updateTabData]
  );

  const saveRecentChannel = useCallback(
    (info: ChannelInfo) => {
      updateTabData(activeTabId, (prev) => ({
        ...prev,
        recentChannels: [
          {
            title: info.title,
            handle: info.handle || info.path,
            path: info.path,
            avatar: info.avatar,
          },
          ...prev.recentChannels.filter((c) => c.path !== info.path),
        ].slice(0, 8),
      }));
    },
    [activeTabId, updateTabData]
  );

  const fetchChannel = useCallback(
    async (
      channelInput: string,
      tab: ChannelTab = 'videos',
      isTabSwitch = false,
      historyMode: 'push' | 'replace' = 'push'
    ) => {
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
        const data = await safeFetchJson<ChannelTabResponse>(
          `/api/channel?q=${encodeURIComponent(channelInput)}&tab=${encodeURIComponent(tab)}`
        );

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

        commitNavigation(
          `#${encodeURIComponent(data.channel.path)}`,
          {
            viewMode: 'channel',
            channel: data.channel,
            activeTab: data.tab,
            items: taggedItems,
            playlists: data.playlists || [],
            about: data.about || null,
            continuation: data.continuation || null,
            activePlaylist: null,
            ...(isTabSwitch ? {} : { playingItem: null, expandedPlayer: null }),
          },
          historyMode
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load channel.');
      } finally {
        setLoadingChannel(false);
        setLoadingTab(false);
      }
    },
    [commitNavigation, saveRecentChannel]
  );

  const loadFeedForContext = useCallback(
    async (targetTab: AppTab, targetData: TabDataState, selectedSeed: string | null) => {
      setLoadingFeed(true);
      setFeedError(null);
      try {
        const seedResult = deriveFeedSeeds(
          targetTab,
          targetData.watchHistory,
          targetData.likedItems,
          targetData.followedChannels,
          targetData.recentChannels
        );
        const seedsToUse = selectedSeed ? [selectedSeed] : seedResult.seeds.slice(0, 4);
        const excludeParam = targetData.watchHistory
          .slice(0, 12)
          .map((w) => w.id)
          .join(',');
        const params = new URLSearchParams();
        if (seedsToUse.length > 0) params.set('seeds', seedsToUse.join('||'));
        if (excludeParam) params.set('exclude', excludeParam);

        const data = await safeFetchJson<FeedResponse>(`/api/feed?${params.toString()}`);
        setFeedItems(data.items || []);
      } catch (err) {
        setFeedError(err instanceof Error ? err.message : 'Unable to load feed.');
      } finally {
        setLoadingFeed(false);
      }
    },
    []
  );

  const loadFeed = useCallback(
    async (selectedSeed: string | null = activeFeedSeed) => {
      await loadFeedForContext(currentTab, currentTabData, selectedSeed);
    },
    [activeFeedSeed, currentTab, currentTabData, loadFeedForContext]
  );

  const openFeedView = useCallback(() => {
    setViewMode('feed');
    setExpandedPlayer(null);
    commitNavigation('#feed', { viewMode: 'feed', expandedPlayer: null }, viewMode === 'feed' ? 'replace' : 'push');
    loadFeedForContext(currentTab, currentTabData, activeFeedSeed);
  }, [activeFeedSeed, commitNavigation, currentTab, currentTabData, loadFeedForContext, viewMode]);

  const activateTab = useCallback(
    (targetTab: AppTab, openFeed = true) => {
      stopLoadAllRef.current = true;
      setLoadingAll(false);
      setError(null);
      setFeedError(null);
      setSearchError(null);
      setPlayingItem(null);
      setPlayingLikedQueue(false);
      setPlayerQueue([]);
      setExpandedPlayer(null);
      setChannel(null);
      setItems([]);
      setPlaylists([]);
      setAbout(null);
      setContinuation(null);
      setActivePlaylist(null);
      setSearchQuery('');
      setSearchVideosList([]);
      setSearchChannelsList([]);
      setSearchContinuation(null);
      setQuery('');
      setActiveFeedSeed(null);

      const loadedData = tabDataMap[targetTab.id] || loadTabData(targetTab.id);
      setTabDataMap((prev) => (prev[targetTab.id] ? prev : { ...prev, [targetTab.id]: loadedData }));
      setActiveTabId(targetTab.id);
      try {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, targetTab.id);
      } catch {
        // Ignore storage error
      }

      if (openFeed) {
        setViewMode('feed');
        commitNavigation(
          '#feed',
          {
            tabId: targetTab.id,
            viewMode: 'feed',
            query: '',
            searchQuery: '',
            searchVideosList: [],
            searchChannelsList: [],
            searchContinuation: null,
            channel: null,
            items: [],
            playlists: [],
            about: null,
            continuation: null,
            activePlaylist: null,
            playingItem: null,
            playerQueue: [],
            playingLikedQueue: false,
            expandedPlayer: null,
          },
          'push'
        );
        loadFeedForContext(targetTab, loadedData, null);
      } else {
        setViewMode('explore');
        commitNavigation(
          '#',
          {
            tabId: targetTab.id,
            viewMode: 'explore',
            playingItem: null,
            expandedPlayer: null,
          },
          'push'
        );
      }
    },
    [commitNavigation, loadFeedForContext, tabDataMap]
  );

  const handleSelectTab = useCallback(
    (targetTab: AppTab) => {
      if (targetTab.id === activeTabId) {
        if (viewMode !== 'feed') {
          openFeedView();
        }
        return;
      }

      activateTab(targetTab, true);
    },
    [activeTabId, activateTab, openFeedView, viewMode]
  );

  const handleCreateTab = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const id = `tab_${Date.now().toString(36)}`;
      const newTab: AppTab = {
        id,
        name: clean,
        kind: 'custom',
      };
      const emptyData = createEmptyTabData();
      saveStorage(`${TAB_DATA_PREFIX}${id}`, emptyData);
      setTabDataMap((prev) => ({ ...prev, [id]: emptyData }));
      setTabs((prev) => {
        const next = [...prev, newTab];
        saveStorage(TABS_STORAGE_KEY, next);
        return next;
      });
      setTabModalState(null);
      activateTab(newTab, true);
    },
    [activateTab]
  );

  const handleEditTab = useCallback((tabId: string, name: string, pin?: string) => {
    setTabs((prev) => {
      const next = prev.map((t) => {
        if (t.id !== tabId) return t;
        const updated: AppTab = {
          ...t,
          name: t.kind === 'custom' ? name : t.name,
        };
        if (t.kind === 'kids') {
          if (pin) {
            updated.pin = pin;
          } else {
            delete updated.pin;
          }
        } else {
          delete updated.pin;
        }
        return updated;
      });
      saveStorage(TABS_STORAGE_KEY, next);
      return next;
    });
    setTabModalState(null);
  }, []);

  const handleDeleteTab = useCallback(
    (tabId: string) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target || target.kind !== 'custom') return;

      try {
        localStorage.removeItem(`${TAB_DATA_PREFIX}${tabId}`);
      } catch {
        // Ignore storage error
      }

      const remaining = tabs.filter((t) => t.id !== tabId);
      saveStorage(TABS_STORAGE_KEY, remaining);
      setTabs(remaining);
      setTabModalState(null);

      if (activeTabId === tabId) {
        const fallback = remaining[0] || DEFAULT_TABS[0];
        activateTab(fallback, true);
      }
    },
    [activeTabId, activateTab, tabs]
  );

  const handleUpdateKidsPin = useCallback((pin?: string) => {
    setTabs((prev) => {
      const next = prev.map((t) => {
        if (t.kind !== 'kids') return t;
        const updated: AppTab = { ...t };
        if (pin) {
          updated.pin = pin;
        } else {
          delete updated.pin;
        }
        return updated;
      });
      saveStorage(TABS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const handleSearchVideos = useCallback(
    async (
      q: string,
      autoplayItem?: MediaItem,
      historyMode: 'push' | 'replace' = 'push'
    ) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setViewMode('search');
      setSearchQuery(trimmed);
      setQuery(trimmed);
      setSearchError(null);
      setLoadingSearch(true);
      setExpandedPlayer(null);
      if (!autoplayItem) {
        setPlayingItem(null);
        setPlayingLikedQueue(false);
      }
      saveRecentSearch(trimmed);

      const searchHash = `#search=${encodeURIComponent(trimmed)}`;
      const pushedSeq = commitNavigation(
        searchHash,
        {
          viewMode: 'search',
          searchQuery: trimmed,
          query: trimmed,
          expandedPlayer: null,
          ...(autoplayItem
            ? { playingItem: autoplayItem, playingLikedQueue: false }
            : { playingItem: null, playingLikedQueue: false }),
        },
        historyMode
      );

      if (autoplayItem) {
        setPlayingLikedQueue(false);
        setPlayingItem(autoplayItem);
      }

      try {
        const data = await safeFetchJson<SearchVideosResponse>(
          `/api/search-videos?q=${encodeURIComponent(trimmed)}&channels=0`
        );

        let finalVideos = data.videos || [];
        if (autoplayItem) {
          finalVideos = [autoplayItem, ...finalVideos.filter((v) => v.id !== autoplayItem.id)];
          setPlayerQueue(finalVideos);
        }

        setSearchVideosList(finalVideos);
        setSearchChannelsList([]);
        setSearchContinuation(data.continuation || null);

        // Update cached snapshot with loaded results so Back restores results instantly
        storeSnapshot(pushedSeq, searchHash, {
          viewMode: 'search',
          searchQuery: trimmed,
          query: trimmed,
          searchVideosList: finalVideos,
          searchChannelsList: [],
          searchContinuation: data.continuation || null,
          ...(autoplayItem
            ? { playingItem: autoplayItem, playerQueue: finalVideos, playingLikedQueue: false }
            : {}),
        });
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Unable to search videos.');
      } finally {
        setLoadingSearch(false);
      }
    },
    [commitNavigation, saveRecentSearch, storeSnapshot]
  );

  async function handleLoadMoreSearch() {
    if (!searchContinuation || loadingMoreSearch) return;
    setLoadingMoreSearch(true);
    try {
      const data = await safeFetchJson<{
        videos?: MediaItem[];
        continuation?: ContinuationInfo | null;
      }>('/api/search-videos/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continuation: searchContinuation }),
      });

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

  // Listen to browser/mobile Back button & OS edge-swipe gesture (popstate)
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      if (kidsScreenLockedRef.current) {
        // Prevent bypassing Kids screen lock via mobile Back or edge swipe
        window.history.pushState(
          { __ytNav: true, seq: currentSeqRef.current },
          '',
          latestNavStateRef.current.hash
        );
        return;
      }

      const raw = e.state as { __ytNav?: boolean; seq?: number } | null;
      const targetSeq = raw?.__ytNav && typeof raw.seq === 'number' ? raw.seq : undefined;
      const snap = targetSeq !== undefined ? navCacheRef.current.get(targetSeq) : undefined;

      if (snap) {
        stopLoadAllRef.current = true;
        setLoadingAll(false);
        setError(null);
        setFeedError(null);
        setSearchError(null);
        currentSeqRef.current = snap.seq;
        setCanGoBack(snap.seq > minSeqRef.current);

        if (snap.tabId !== activeTabId) {
          const loaded = tabDataMap[snap.tabId] || loadTabData(snap.tabId);
          setTabDataMap((prev) => (prev[snap.tabId] ? prev : { ...prev, [snap.tabId]: loaded }));
          setActiveTabId(snap.tabId);
        }

        setViewMode(snap.viewMode);
        setQuery(snap.query);
        setSearchQuery(snap.searchQuery);
        setSearchVideosList(snap.searchVideosList);
        setSearchChannelsList(snap.searchChannelsList);
        setSearchContinuation(snap.searchContinuation);
        setChannel(snap.channel);
        setActiveTab(snap.activeTab);
        setItems(snap.items);
        setPlaylists(snap.playlists);
        setAbout(snap.about);
        setContinuation(snap.continuation);
        setActivePlaylist(snap.activePlaylist);
        setPlayingItem(snap.playingItem);
        setPlayerQueue(snap.playerQueue);
        setPlayingLikedQueue(snap.playingLikedQueue);
        setExpandedPlayer(snap.expandedPlayer);

        if (snap.viewMode === 'feed' && feedItems.length === 0) {
          const targetTabObj = tabs.find((t) => t.id === snap.tabId) || currentTab;
          const targetDataObj = tabDataMap[snap.tabId] || loadTabData(snap.tabId);
          loadFeedForContext(targetTabObj, targetDataObj, null);
        }
        return;
      }

      // Fallback if external hash state popped
      const hash = window.location.hash.replace(/^#/, '');
      const decoded = hash ? decodeURIComponent(hash) : '';
      setExpandedPlayer(null);
      setPlayingItem(null);
      if (decoded === 'feed') {
        setViewMode('feed');
      } else if (decoded === 'liked') {
        setViewMode('liked');
      } else if (decoded === 'following') {
        setViewMode('following');
      } else if (decoded.startsWith('search=')) {
        const sq = decoded.slice('search='.length).trim();
        if (sq) handleSearchVideos(sq, undefined, 'replace');
      } else if (decoded.trim()) {
        fetchChannel(decoded, 'videos', false, 'replace');
      } else {
        setViewMode('explore');
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    activeTabId,
    currentTab,
    feedItems.length,
    fetchChannel,
    handleSearchVideos,
    loadFeedForContext,
    tabDataMap,
    tabs,
  ]);

  // First visit -> Home only. Returning visits -> restore most recent tab & open its Feed directly!
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const decoded = hash ? decodeURIComponent(hash) : '';

    let hasVisitedBefore = false;
    try {
      hasVisitedBefore = localStorage.getItem(HAS_VISITED_STORAGE_KEY) === '1';
      if (!hasVisitedBefore) {
        localStorage.setItem(HAS_VISITED_STORAGE_KEY, '1');
      }
    } catch {
      hasVisitedBefore = false;
    }

    if (decoded && decoded !== 'feed') {
      if (decoded === 'liked') {
        setViewMode('liked');
        commitNavigation('#liked', { viewMode: 'liked' }, 'replace');
        return;
      }
      if (decoded === 'following') {
        setViewMode('following');
        commitNavigation('#following', { viewMode: 'following' }, 'replace');
        return;
      }
      if (decoded.startsWith('search=')) {
        const sq = decoded.slice('search='.length).trim();
        if (sq) {
          handleSearchVideos(sq, undefined, 'replace');
          return;
        }
      } else if (decoded.trim()) {
        fetchChannel(decoded, 'videos', false, 'replace');
        return;
      }
    }

    if (!hasVisitedBefore && decoded !== 'feed') {
      setViewMode('explore');
      commitNavigation('#', { viewMode: 'explore' }, 'replace');
      return;
    }

    // Returning visitor: restore most recent tab and go straight to its Feed
    setViewMode('feed');
    commitNavigation('#feed', { viewMode: 'feed' }, 'replace');
    loadFeedForContext(currentTab, currentTabData, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadMore() {
    if (!continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await safeFetchJson<{
        items?: MediaItem[];
        playlists?: PlaylistCard[];
        continuation?: ContinuationInfo | null;
      }>('/api/channel/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continuation, tab: activeTab }),
      });

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
        const data: {
          items?: MediaItem[];
          playlists?: PlaylistCard[];
          continuation?: ContinuationInfo | null;
        } = await safeFetchJson('/api/channel/more', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ continuation: currentCont, tab: activeTab }),
        });

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
      const data = await safeFetchJson<PlaylistDetailResponse>(
        `/api/playlist?list=${encodeURIComponent(playlist.id)}`
      );
      const taggedVideos = (data.videos || []).map((v) => ({
        ...v,
        channelTitle: v.channelTitle || data.author || channel?.title,
      }));
      const nextPlaylist = { ...data, videos: taggedVideos };
      setActivePlaylist(nextPlaylist);
      commitNavigation(
        latestNavStateRef.current.hash,
        { activePlaylist: nextPlaylist },
        'push'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load playlist.');
    } finally {
      setLoadingPlaylist(false);
    }
  }

  function handlePlayItem(item: MediaItem, customQueue?: MediaItem[]) {
    const queue = customQueue || items;
    const wasPlaying = Boolean(playingItem);
    setPlayingLikedQueue(false);
    setPlayerStartSeconds(0);
    setPlayingItem(item);
    setPlayerQueue(queue);
    recordWatch(item);
    commitNavigation(
      latestNavStateRef.current.hash,
      { playingItem: item, playerQueue: queue, playingLikedQueue: false },
      wasPlaying ? 'replace' : 'push'
    );
  }

  function handlePlayLikedTrack(item: MediaItem, shuffle = false) {
    const wasPlaying = Boolean(playingItem);
    setPlayingLikedQueue(true);
    setAutoPlayNext(true);
    setLoopQueue(true);
    setShuffleQueue(shuffle);
    setPlayerStartSeconds(0);
    setPlayingItem(item);
    setPlayerQueue(likedItems);
    recordWatch(item);
    commitNavigation(
      latestNavStateRef.current.hash,
      { playingItem: item, playerQueue: likedItems, playingLikedQueue: true },
      wasPlaying ? 'replace' : 'push'
    );
  }

  function openExpandedPlayer(
    item: MediaItem,
    initialRotation: 0 | 90 | 180 | 270,
    startSeconds?: number,
    lockOnOpen?: boolean
  ) {
    const nextExpanded: ExpandedPlayerState = {
      item,
      initialRotation,
      startSeconds,
      lockOnOpen,
    };
    const wasExpanded = Boolean(expandedPlayer);
    setExpandedPlayer(nextExpanded);
    commitNavigation(
      latestNavStateRef.current.hash,
      { expandedPlayer: nextExpanded },
      wasExpanded ? 'replace' : 'push'
    );
  }

  function closeExpandedPlayer() {
    const hadExpanded = Boolean(
      navCacheRef.current.get(currentSeqRef.current)?.expandedPlayer
    );
    setExpandedPlayer(null);
    if (hadExpanded && currentSeqRef.current > minSeqRef.current) {
      window.history.back();
    }
  }

  function handleStopPlay() {
    const curSnap = navCacheRef.current.get(currentSeqRef.current);
    const prevSnap = navCacheRef.current.get(currentSeqRef.current - 1);
    setPlayingItem(null);
    if (
      curSnap?.playingItem &&
      prevSnap &&
      !prevSnap.playingItem &&
      prevSnap.viewMode === curSnap.viewMode &&
      currentSeqRef.current > minSeqRef.current
    ) {
      window.history.back();
    }
  }

  const activeQueue = playerQueue.length > 0 ? playerQueue : items;
  const currentIndex = playingItem ? activeQueue.findIndex((q) => q.id === playingItem.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext =
    activeQueue.length > 1 &&
    (shuffleQueue || loopQueue || (currentIndex >= 0 && currentIndex < activeQueue.length - 1));

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
        setPlayerStartSeconds(0);
        setPlayingItem(nextItem);
        recordWatch(nextItem);
        if (expandedPlayer) {
          setExpandedPlayer((prev) =>
            prev ? { ...prev, item: nextItem!, startSeconds: 0 } : null
          );
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

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    const prevItem = activeQueue[currentIndex - 1];
    if (prevItem) {
      setPlayerStartSeconds(0);
      setPlayingItem(prevItem);
      recordWatch(prevItem);
      if (expandedPlayer) {
        setExpandedPlayer((prev) =>
          prev ? { ...prev, item: prevItem, startSeconds: 0 } : null
        );
      }
    }
  }, [hasPrev, activeQueue, currentIndex, expandedPlayer, recordWatch]);

  function handleChangeMode(nextMode: 'videos' | 'music') {
    if (nextMode === appMode) return;
    setPreferredMode(nextMode);
    try {
      localStorage.setItem(PREFERRED_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage error
    }
    updateTabData(activeTabId, (prev) => ({ ...prev, appMode: nextMode }));
    setExpandedPlayer(null);
    if (nextMode === 'videos') {
      setPlayingItem(null);
    }
  }

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
    if (appMode !== 'music') {
      setPlayingItem(null);
    }
    setExpandedPlayer(null);
    setQuery('');
    setError(null);
    commitNavigation(
      '#',
      {
        viewMode: 'explore',
        channel: null,
        items: [],
        playlists: [],
        about: null,
        continuation: null,
        activePlaylist: null,
        playingItem: appMode !== 'music' ? null : playingItem,
        expandedPlayer: null,
        query: '',
      },
      viewMode === 'explore' ? 'replace' : 'push'
    );
  }

  const isKidsTab = currentTab.kind === 'kids';
  const kidsTab = useMemo(() => tabs.find((t) => t.kind === 'kids') || DEFAULT_TABS[1], [tabs]);

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#111111] transition-colors dark:bg-[#0B0B0D] dark:text-[#F4F4F6]">
      <LaptopSidebar
        appMode={appMode}
        activeView={viewMode}
        likedCount={likedItems.length}
        followedChannels={followedChannels}
        activeChannelPath={channel?.path}
        tabs={tabs}
        activeTabId={activeTabId}
        theme={theme}
        onChangeTheme={setTheme}
        onSelectTab={handleSelectTab}
        onEditTab={(tab) => setTabModalState({ mode: 'edit', tab })}
        onOpenKidsPassword={() => setKidsPasswordOpen(true)}
        onCreateTab={() => setTabModalState({ mode: 'create' })}
        onResetHome={handleResetHome}
        onOpenFeed={openFeedView}
        onOpenFollowing={() => {
          setViewMode('following');
          commitNavigation(
            '#following',
            { viewMode: 'following' },
            viewMode === 'following' ? 'replace' : 'push'
          );
        }}
        onOpenLiked={() => {
          setViewMode('liked');
          commitNavigation(
            '#liked',
            { viewMode: 'liked' },
            viewMode === 'liked' ? 'replace' : 'push'
          );
        }}
        onChangeMode={handleChangeMode}
        onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
      />

      <TopNav
        query={query}
        loading={loadingChannel || loadingSearch}
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
        onOpenFollowing={() => {
          setViewMode('following');
          commitNavigation(
            '#following',
            { viewMode: 'following' },
            viewMode === 'following' ? 'replace' : 'push'
          );
        }}
        onResetHome={handleResetHome}
      />

      {appMode === 'videos' && expandedPlayer && (
        <RotatedFullPlayer
          current={expandedPlayer.item}
          initialRotation={expandedPlayer.initialRotation}
          startSeconds={expandedPlayer.startSeconds ?? 0}
          isKidsTab={isKidsTab}
          kidsPin={isKidsTab ? currentTab.pin : undefined}
          initialLocked={expandedPlayer.lockOnOpen}
          onSaveKidsPin={handleUpdateKidsPin}
          onLockChange={(locked) => {
            kidsScreenLockedRef.current = locked;
          }}
          onSwitchHalf={
            isDesktop
              ? (sec) => {
                  setPlayerStartSeconds(sec);
                  closeExpandedPlayer();
                }
              : undefined
          }
          onEnded={() => advanceToNext(false)}
          onClose={closeExpandedPlayer}
        />
      )}

      {appMode === 'music' && playingItem && (
        <MusicPlayerBar
          current={playingItem}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isLiked={isLiked(playingItem.id)}
          shuffleQueue={shuffleQueue}
          loopQueue={loopQueue}
          onPrev={goPrev}
          onNext={() => advanceToNext(true)}
          onEnded={() => advanceToNext(false)}
          onToggleLike={handleToggleLike}
          onToggleShuffle={() => setShuffleQueue((v) => !v)}
          onToggleLoop={() => setLoopQueue((v) => !v)}
          onClose={handleStopPlay}
        />
      )}

      <div className="lg:pl-60 xl:pl-64">
        {error && viewMode === 'channel' && channel && (
          <div className="mx-auto max-w-[1440px] px-3 pt-4 sm:px-6">
            <div
              role="alert"
              className="rounded-xl border border-[#E11D48]/30 bg-[#E11D48]/5 px-4 py-3 text-sm text-[#BE123C] dark:bg-[#E11D48]/10 dark:text-[#FDA4AF]"
            >
              {error}
            </div>
          </div>
        )}

        {viewMode === 'search' ? (
          <SearchResultsView
            appMode={appMode}
            isDesktop={isDesktop}
            isKidsTab={isKidsTab}
            searchQuery={searchQuery}
            videos={searchVideosList}
            channels={searchChannelsList}
            hasMore={Boolean(searchContinuation)}
            loading={loadingSearch}
            loadingMore={loadingMoreSearch}
            error={searchError}
            playingItem={playingItem}
            startSeconds={playerStartSeconds}
            hasPrev={hasPrev}
            hasNext={hasNext}
            hasExpandedPlayer={Boolean(expandedPlayer)}
            isLiked={isLiked}
            onPlayItem={handlePlayItem}
            onStopPlay={handleStopPlay}
            onPrev={goPrev}
            onNext={() => advanceToNext(true)}
            onEnded={() => advanceToNext(false)}
            onExpandFull={openExpandedPlayer}
            onToggleLike={handleToggleLike}
            onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
            onLoadMore={handleLoadMoreSearch}
          />
        ) : viewMode === 'feed' ? (
          <FeedView
            appMode={appMode}
            isDesktop={isDesktop}
            isKidsTab={isKidsTab}
            activeTabName={currentTab.name}
            items={feedItems}
            seeds={feedSeedInfo.seeds}
            activeSeed={activeFeedSeed}
            personalized={feedSeedInfo.personalized}
            loading={loadingFeed}
            error={feedError}
            playingItem={playingItem}
            startSeconds={playerStartSeconds}
            hasPrev={hasPrev}
            hasNext={hasNext}
            hasExpandedPlayer={Boolean(expandedPlayer)}
            isLiked={isLiked}
            onSelectSeed={(seed) => {
              setActiveFeedSeed(seed);
              loadFeed(seed);
            }}
            onRefresh={() => loadFeed(activeFeedSeed)}
            onPlayItem={handlePlayItem}
            onStopPlay={handleStopPlay}
            onPrev={goPrev}
            onNext={() => advanceToNext(true)}
            onEnded={() => advanceToNext(false)}
            onExpandFull={openExpandedPlayer}
            onToggleLike={handleToggleLike}
            onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
          />
        ) : viewMode === 'following' ? (
          <FollowingView
            followedChannels={followedChannels}
            onOpenChannel={(path) => fetchChannel(path, 'videos', false)}
            onUnfollow={handleUnfollow}
          />
        ) : viewMode === 'liked' ? (
          <LikedPlaylistView
            appMode={appMode}
            isDesktop={isDesktop}
            isKidsTab={isKidsTab}
            likedItems={likedItems}
            playingItem={playingItem}
            startSeconds={playerStartSeconds}
            hasPrev={hasPrev}
            hasNext={hasNext}
            hasExpandedPlayer={Boolean(expandedPlayer)}
            autoPlayNext={autoPlayNext}
            loopQueue={loopQueue}
            onPlayTrack={handlePlayLikedTrack}
            onStopPlay={handleStopPlay}
            onPrev={goPrev}
            onNext={() => advanceToNext(true)}
            onEnded={() => advanceToNext(false)}
            onExpandFull={openExpandedPlayer}
            onToggleAutoPlay={() => setAutoPlayNext((v) => !v)}
            onToggleLoop={() => setLoopQueue((v) => !v)}
            onToggleLike={handleToggleLike}
            onClearAll={handleClearLiked}
          />
        ) : viewMode === 'channel' && channel ? (
          <ChannelView
            appMode={appMode}
            isDesktop={isDesktop}
            isKidsTab={isKidsTab}
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
            startSeconds={playerStartSeconds}
            hasPrev={hasPrev}
            hasNext={hasNext}
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
            onChangeTab={(tab) => fetchChannel(channel.path, tab, true, 'replace')}
            onLoadMore={handleLoadMore}
            onLoadAll={handleLoadAll}
            onStopLoadAll={() => {
              stopLoadAllRef.current = true;
            }}
            onPlayItem={handlePlayItem}
            onStopPlay={handleStopPlay}
            onPrev={goPrev}
            onNext={() => advanceToNext(true)}
            onEnded={() => advanceToNext(false)}
            onExpandFull={openExpandedPlayer}
            onOpenPlaylist={handleOpenPlaylist}
            onClosePlaylist={() => {
              const hadPlaylist = Boolean(
                navCacheRef.current.get(currentSeqRef.current)?.activePlaylist
              );
              setActivePlaylist(null);
              if (hadPlaylist && currentSeqRef.current > minSeqRef.current) {
                window.history.back();
              }
            }}
          />
        ) : (
          <ExploreHome
            appMode={appMode}
            onChangeMode={handleChangeMode}
            loading={loadingChannel}
            error={error}
            likedItems={likedItems}
            followedChannels={followedChannels}
            recentChannels={recentChannels}
            onSubmitChannel={(input) => fetchChannel(input, 'videos', false)}
            onOpenFollowing={() => {
              setViewMode('following');
              commitNavigation('#following', { viewMode: 'following' }, 'push');
            }}
            onOpenLiked={() => {
              setViewMode('liked');
              commitNavigation('#liked', { viewMode: 'liked' }, 'push');
            }}
            onPlayLikedAll={() => {
              if (likedItems[0]) {
                setViewMode('liked');
                commitNavigation('#liked', { viewMode: 'liked' }, 'push');
                handlePlayLikedTrack(likedItems[0], false);
              }
            }}
          />
        )}
      </div>

      <BottomNav
        tabs={tabs}
        activeTab={currentTab}
        activeView={viewMode}
        appMode={appMode}
        likedCount={likedItems.length}
        theme={theme}
        onChangeMode={handleChangeMode}
        onChangeTheme={setTheme}
        onOpenFeed={openFeedView}
        onOpenLiked={() => {
          setViewMode('liked');
          commitNavigation(
            '#liked',
            { viewMode: 'liked' },
            viewMode === 'liked' ? 'replace' : 'push'
          );
        }}
        onSelectTab={handleSelectTab}
        onCreateTabInline={handleCreateTab}
        onEditTab={(tab) => setTabModalState({ mode: 'edit', tab })}
        onOpenKidsPassword={() => setKidsPasswordOpen(true)}
      />

      {kidsPasswordOpen && (
        <PinModal
          mode="setup"
          title="Kids Screen Lock PIN"
          subtitle="Set or change 1–4 digit PIN for Kids video screen lock"
          canRemove={Boolean(kidsTab.pin)}
          onSuccess={(newPin) => {
            handleUpdateKidsPin(newPin);
            setKidsPasswordOpen(false);
          }}
          onRemovePin={() => {
            handleUpdateKidsPin(undefined);
            setKidsPasswordOpen(false);
          }}
          onCancel={() => setKidsPasswordOpen(false)}
        />
      )}

      {tabModalState && (
        <TabModal
          mode={tabModalState.mode}
          tab={tabModalState.tab}
          onSaveCreate={handleCreateTab}
          onSaveEdit={handleEditTab}
          onDeleteTab={handleDeleteTab}
          onClose={() => setTabModalState(null)}
        />
      )}

      <EdgeSwipeBack
        enabled={canGoBack && !(isKidsTab && Boolean(expandedPlayer) && kidsScreenLockedRef.current)}
        onSwipeBack={() => window.history.back()}
      />

      <OfflineIndicator />
    </div>
  );
}
