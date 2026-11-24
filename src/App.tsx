import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChannelView } from './components/ChannelView';
import { ExploreHome } from './components/ExploreHome';
import { InlinePlayer } from './components/InlinePlayer';
import { LikedPlaylistView } from './components/LikedPlaylistView';
import { TopNav } from './components/TopNav';
import type {
  ChannelAbout,
  ChannelInfo,
  ChannelTab,
  ChannelTabResponse,
  ContinuationInfo,
  LikedItem,
  MediaItem,
  PlaylistCard,
  PlaylistDetailResponse,
} from './types';

interface RecentChannel {
  title: string;
  handle: string;
  path: string;
  avatar: string;
}

const RECENT_STORAGE_KEY = 'channelplay_recent_channels';
const LIKED_STORAGE_KEY = 'channelplay_liked_items';

function loadRecentFromStorage(): RecentChannel[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLikedFromStorage(): LikedItem[] {
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'explore' | 'channel' | 'liked'>('explore');

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
  const [playerQueueLabel, setPlayerQueueLabel] = useState<string>('');
  const [playingLikedQueue, setPlayingLikedQueue] = useState(false);

  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [loopQueue, setLoopQueue] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState(false);

  const [activePlaylist, setActivePlaylist] = useState<PlaylistDetailResponse | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const [recentChannels, setRecentChannels] = useState<RecentChannel[]>(loadRecentFromStorage);
  const [likedItems, setLikedItems] = useState<LikedItem[]>(loadLikedFromStorage);

  const likedIdSet = useMemo(() => new Set(likedItems.map((l) => l.id)), [likedItems]);

  const isLiked = useCallback((id: string) => likedIdSet.has(id), [likedIdSet]);

  const persistLiked = useCallback((next: LikedItem[]) => {
    try {
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(next));
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
    }
  }, [persistLiked, playingLikedQueue]);

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
        setQuery(data.channel.handle || data.channel.title);
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

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const decoded = decodeURIComponent(hash);
      if (decoded === 'liked') {
        setViewMode('liked');
      } else if (decoded.trim()) {
        fetchChannel(decoded, 'videos', false);
      }
    }
  }, [fetchChannel]);

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

  function handlePlayItem(item: MediaItem, customQueue?: MediaItem[], queueLabel?: string) {
    setPlayingLikedQueue(false);
    setPlayingItem(item);
    setPlayerQueue(customQueue || items);
    setPlayerQueueLabel(queueLabel || `${channel?.title || 'Channel'} Queue`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePlayLikedTrack(item: MediaItem, shuffle = false) {
    setPlayingLikedQueue(true);
    setAutoPlayNext(true);
    setLoopQueue(true);
    setShuffleQueue(shuffle);
    setPlayingItem(item);
    setPlayerQueue(likedItems);
    setPlayerQueueLabel('Liked Playlist');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setQuery('');
    setError(null);
    window.history.replaceState(null, '', '#');
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#111111]">
      <TopNav
        query={query}
        loading={loadingChannel}
        likedCount={likedItems.length}
        viewingLiked={viewMode === 'liked'}
        recentChannels={recentChannels}
        onSubmitChannel={(input) => fetchChannel(input, 'videos', false)}
        onOpenLiked={() => {
          setViewMode('liked');
          window.history.replaceState(null, '', '#liked');
        }}
        onResetHome={handleResetHome}
      />

      {playingItem && (
        <InlinePlayer
          current={playingItem}
          queue={playerQueue.length > 0 ? playerQueue : items}
          channelTitle={playingItem.channelTitle || channel?.title || 'ChannelPlay'}
          queueLabel={playerQueueLabel}
          autoPlayNext={autoPlayNext}
          loopQueue={loopQueue}
          shuffleQueue={shuffleQueue}
          isLiked={isLiked}
          onToggleLike={handleToggleLike}
          onToggleAutoPlay={() => setAutoPlayNext((v) => !v)}
          onToggleLoop={() => setLoopQueue((v) => !v)}
          onToggleShuffle={() => setShuffleQueue((v) => !v)}
          onSelect={(item) => setPlayingItem(item)}
          onClose={() => {
            setPlayingItem(null);
            setPlayingLikedQueue(false);
          }}
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

      {viewMode === 'liked' ? (
        <LikedPlaylistView
          likedItems={likedItems}
          playingItem={playingItem}
          hasChannelOpen={Boolean(channel)}
          onPlayTrack={handlePlayLikedTrack}
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
          activePlaylist={activePlaylist}
          loadingPlaylist={loadingPlaylist}
          isLiked={isLiked}
          onToggleLike={handleToggleLike}
          onChangeTab={(tab) => fetchChannel(channel.path, tab, true)}
          onLoadMore={handleLoadMore}
          onLoadAll={handleLoadAll}
          onStopLoadAll={() => {
            stopLoadAllRef.current = true;
          }}
          onPlayItem={handlePlayItem}
          onOpenPlaylist={handleOpenPlaylist}
          onClosePlaylist={() => setActivePlaylist(null)}
        />
      ) : (
        <ExploreHome
          loading={loadingChannel}
          error={error}
          likedItems={likedItems}
          recentChannels={recentChannels}
          onSubmitChannel={(input) => fetchChannel(input, 'videos', false)}
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
