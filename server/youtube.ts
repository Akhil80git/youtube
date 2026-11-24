import type {
  ChannelAbout,
  ChannelInfo,
  ChannelSearchResult,
  ChannelTab,
  ChannelTabResponse,
  ContinuationInfo,
  MediaItem,
  PlaylistCard,
  PlaylistDetailResponse,
} from '../src/types.ts';

const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const ALLOWED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);

const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'SOCS=CAI',
};

function sanitizeImageUrl(url: unknown): string {
  if (typeof url !== 'string' || !url.trim()) return '';
  let trimmed = url.trim();
  if (trimmed.startsWith('//')) trimmed = `https:${trimmed}`;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function sanitizeExternalUrl(url: unknown): string {
  if (typeof url !== 'string' || !url.trim()) return '';
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function pickBestThumbnail(sources: unknown): string {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const best = sources[sources.length - 1];
  return sanitizeImageUrl((best as { url?: string })?.url);
}

function readText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (typeof n.simpleText === 'string') return n.simpleText;
  if (typeof n.content === 'string') return n.content;
  if (Array.isArray(n.runs)) {
    return n.runs
      .map((r) => (typeof (r as { text?: unknown }).text === 'string' ? (r as { text: string }).text : ''))
      .join('');
  }
  return '';
}

async function fetchYoutubeHtml(pathAndQuery: string): Promise<string> {
  const url = `${YOUTUBE_ORIGIN}${pathAndQuery}`;
  const res = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Channel lookup failed with status ${res.status}`);
  }
  return res.text();
}

function extractYtData(html: string): {
  data: Record<string, unknown>;
  apiKey: string;
  clientVersion: string;
} {
  const dataMatch =
    html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/) ||
    html.match(/window\["ytInitialData"\] = (\{[\s\S]*?\});/);

  if (!dataMatch) {
    throw new Error('Could not find channel data on that page.');
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataMatch[1]) as Record<string, unknown>;
  } catch {
    throw new Error('Failed to parse channel data.');
  }

  let apiKey = '';
  let clientVersion = '2.20261123.00.00';
  const cfgMatch = html.match(/ytcfg\.set\((\{[\s\S]*?\})\);/);
  if (cfgMatch) {
    try {
      const cfg = JSON.parse(cfgMatch[1]) as Record<string, unknown>;
      if (typeof cfg.INNERTUBE_API_KEY === 'string') apiKey = cfg.INNERTUBE_API_KEY;
      if (typeof cfg.INNERTUBE_CLIENT_VERSION === 'string') {
        clientVersion = cfg.INNERTUBE_CLIENT_VERSION;
      }
    } catch {
      // Ignore partial cfg match
    }
  }

  return { data, apiKey, clientVersion };
}

export async function resolveChannelPath(rawQuery: string): Promise<string> {
  const q = rawQuery.trim();
  if (!q) {
    throw new Error('Please enter a channel name, @handle, or YouTube URL.');
  }

  // Handle direct URLs (only YouTube domains allowed)
  if (/^https?:\/\//i.test(q) || /^(www\.|m\.)?youtube\.com\//i.test(q)) {
    const withProto = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    let parsed: URL;
    try {
      parsed = new URL(withProto);
    } catch {
      throw new Error('Invalid YouTube URL.');
    }
    if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      throw new Error('Only YouTube channel URLs are supported.');
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      throw new Error('Please paste a specific YouTube channel URL.');
    }
    if (segments[0].startsWith('@')) {
      const handle = segments[0].replace(/[^a-zA-Z0-9._@-]/g, '');
      if (handle.length < 2) throw new Error('Invalid channel handle.');
      return `/${handle}`;
    }
    if (segments[0] === 'channel' && segments[1] && /^UC[a-zA-Z0-9_-]{18,32}$/.test(segments[1])) {
      return `/channel/${segments[1]}`;
    }
    if ((segments[0] === 'c' || segments[0] === 'user') && segments[1]) {
      const cleanName = segments[1].replace(/[^a-zA-Z0-9._-]/g, '');
      if (cleanName) return `/${segments[0]}/${cleanName}`;
    }
    // Single-segment legacy custom URL like youtube.com/Fireship
    const legacy = segments[0].replace(/[^a-zA-Z0-9._-]/g, '');
    if (legacy && !['watch', 'shorts', 'playlist', 'results', 'feed'].includes(legacy.toLowerCase())) {
      return `/@${legacy}`;
    }
    throw new Error('Could not detect a channel from that URL. Try a channel URL like youtube.com/@Fireship.');
  }

  // Handle @handle directly
  if (q.startsWith('@')) {
    const cleanHandle = q.replace(/[^a-zA-Z0-9._@-]/g, '');
    if (cleanHandle.length < 2) throw new Error('Invalid channel handle.');
    return `/${cleanHandle}`;
  }

  // Handle UC... channel ID directly
  if (/^UC[a-zA-Z0-9_-]{20,30}$/.test(q)) {
    return `/channel/${q}`;
  }

  // Plain text search -> find best matching channel
  const results = await searchChannels(q);
  if (results.length > 0) {
    return results[0].path;
  }

  // Fallback: try as @handle if single token
  const handleGuess = q.replace(/[^a-zA-Z0-9._-]/g, '');
  if (handleGuess.length >= 2) {
    return `/@${handleGuess}`;
  }
  throw new Error(`No channel found matching "${q}".`);
}

export async function searchChannels(query: string): Promise<ChannelSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) return [];

  const html = await fetchYoutubeHtml(
    `/results?search_query=${encodeURIComponent(trimmed)}&sp=EgIQAg%3D%3D`
  );
  const { data } = extractYtData(html);

  const sections =
    (data.contents as any)?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
      ?.contents || [];

  const results: ChannelSearchResult[] = [];
  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const ch = item?.channelRenderer;
      if (!ch) continue;
      const channelId = typeof ch.channelId === 'string' ? ch.channelId : '';
      const navUrl = ch.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
      let path = typeof navUrl === 'string' && navUrl.startsWith('/') ? navUrl : '';
      if (!path && channelId) path = `/channel/${channelId}`;
      if (!path) continue;

      const subOrHandle = readText(ch.subscriberCountText);
      const vidOrSub = readText(ch.videoCountText);
      const handle = subOrHandle.startsWith('@')
        ? subOrHandle
        : path.startsWith('/@')
          ? path.slice(1)
          : '';
      const subscribersText = subOrHandle.startsWith('@') ? vidOrSub : subOrHandle;

      results.push({
        id: channelId || path,
        title: readText(ch.title) || handle || 'Channel',
        handle,
        path,
        avatar: pickBestThumbnail(ch.thumbnail?.thumbnails),
        subscribersText,
        description: readText(ch.descriptionSnippet),
      });

      if (results.length >= 8) break;
    }
    if (results.length >= 8) break;
  }

  return results;
}

function parseChannelInfo(data: Record<string, unknown>, fallbackPath: string): ChannelInfo {
  const meta = (data.metadata as any)?.channelMetadataRenderer || {};
  const header = (data.header as any) || {};
  const pageHeader = header.pageHeaderRenderer;
  const c4Header = header.c4TabbedHeaderRenderer;

  let title = meta.title || '';
  let handle = '';
  let subscribersText = '';
  let videoCountText = '';
  let description = meta.description || '';
  let avatar = pickBestThumbnail(meta.avatar?.thumbnails);
  let banner = '';

  if (pageHeader) {
    title = pageHeader.pageTitle || title;
    const vm = pageHeader.content?.pageHeaderViewModel;
    if (vm) {
      avatar =
        pickBestThumbnail(
          vm.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources
        ) || avatar;
      banner = pickBestThumbnail(vm.banner?.imageBannerViewModel?.image?.sources) || banner;
      description = vm.description?.descriptionPreviewViewModel?.description?.content || description;
      const rows = vm.metadata?.contentMetadataViewModel?.metadataRows || [];
      for (const row of rows) {
        const parts = row?.metadataParts || [];
        for (const part of parts) {
          const txt = readText(part?.text);
          if (!txt) continue;
          if (txt.startsWith('@')) handle = txt;
          else if (/subscriber/i.test(txt)) subscribersText = txt;
          else if (/video/i.test(txt)) videoCountText = txt;
        }
      }
    }
  } else if (c4Header) {
    title = c4Header.title || title;
    avatar = pickBestThumbnail(c4Header.avatar?.thumbnails) || avatar;
    banner = pickBestThumbnail(c4Header.banner?.thumbnails) || banner;
    subscribersText = readText(c4Header.subscriberCountText);
    videoCountText = readText(c4Header.videosCountText);
    handle = readText(c4Header.channelHandleText);
  }

  const canonicalUrl =
    typeof meta.channelUrl === 'string'
      ? meta.channelUrl
      : `${YOUTUBE_ORIGIN}${fallbackPath}`;

  let path = fallbackPath;
  if (typeof meta.vanityChannelUrl === 'string') {
    try {
      const parsed = new URL(meta.vanityChannelUrl);
      if (parsed.pathname && parsed.pathname !== '/') {
        path = parsed.pathname;
        if (!handle && parsed.pathname.startsWith('/@')) {
          handle = parsed.pathname.slice(1);
        }
      }
    } catch {
      // keep fallbackPath
    }
  }

  const rawTabs = (data.contents as any)?.twoColumnBrowseResultsRenderer?.tabs || [];
  const availableTabs: ChannelTab[] = [];
  for (const t of rawTabs) {
    const titleLower = (t?.tabRenderer?.title || '').toLowerCase();
    if (titleLower === 'videos') availableTabs.push('videos');
    else if (titleLower === 'shorts') availableTabs.push('shorts');
    else if (titleLower === 'live') availableTabs.push('live');
    else if (titleLower === 'playlists') availableTabs.push('playlists');
  }
  if (!availableTabs.includes('videos')) availableTabs.unshift('videos');
  availableTabs.push('about');

  return {
    id: meta.externalId || '',
    title: title || handle || 'YouTube Channel',
    handle: handle || (path.startsWith('/@') ? path.slice(1) : ''),
    path,
    url: canonicalUrl,
    avatar,
    banner,
    subscribersText,
    videoCountText,
    description,
    availableTabs,
  };
}

function parseMediaNode(
  content: any,
  defaultType: 'video' | 'short' | 'live'
): MediaItem | null {
  if (!content || typeof content !== 'object') return null;

  // Modern YouTube lockupViewModel
  if (content.lockupViewModel && content.lockupViewModel.contentType !== 'LOCKUP_CONTENT_TYPE_PLAYLIST') {
    const vm = content.lockupViewModel;
    const videoId = typeof vm.contentId === 'string' ? vm.contentId : '';
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

    const thumbVm = vm.contentImage?.thumbnailViewModel;
    const thumbnail =
      pickBestThumbnail(thumbVm?.image?.sources) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    let duration = '';
    let isLiveNow = false;
    const overlays = thumbVm?.overlays || [];
    for (const ov of overlays) {
      const badges = ov?.thumbnailBottomOverlayViewModel?.badges || [];
      for (const b of badges) {
        const badgeText = b?.thumbnailBadgeViewModel?.text;
        if (typeof badgeText === 'string' && badgeText.trim()) {
          duration = badgeText.trim();
          if (/^LIVE$/i.test(duration)) isLiveNow = true;
        }
      }
    }

    const metaVm = vm.metadata?.lockupMetadataViewModel;
    const title = readText(metaVm?.title) || 'Untitled video';
    const rows = metaVm?.metadata?.contentMetadataViewModel?.metadataRows || [];

    let viewsText = '';
    let publishedText = '';
    for (const row of rows) {
      const parts = row?.metadataParts || [];
      for (const part of parts) {
        const txt = readText(part?.text);
        if (!txt) continue;
        if (/watching|live/i.test(txt)) {
          viewsText = txt;
          isLiveNow = true;
        } else if (/ago|streamed|premiered|scheduled/i.test(txt)) {
          publishedText = txt;
        } else if (!viewsText && (/\d/.test(txt) || /view/i.test(txt))) {
          viewsText = /view/i.test(txt) ? txt : `${txt} views`;
        } else if (!publishedText) {
          publishedText = txt;
        }
      }
    }

    return {
      id: videoId,
      title,
      thumbnail,
      duration,
      viewsText,
      publishedText,
      type: defaultType,
      isLiveNow,
    };
  }

  // Shorts lockupViewModel
  if (content.shortsLockupViewModel) {
    const s = content.shortsLockupViewModel;
    const videoId = s.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || '';
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

    const thumbnail =
      pickBestThumbnail(s.thumbnail?.sources) ||
      pickBestThumbnail(s.onTap?.innertubeCommand?.reelWatchEndpoint?.thumbnail?.thumbnails) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const title = readText(s.overlayMetadata?.primaryText) || 'Short';
    const viewsText = readText(s.overlayMetadata?.secondaryText);

    return {
      id: videoId,
      title,
      thumbnail,
      duration: 'Short',
      viewsText,
      publishedText: '',
      type: 'short',
    };
  }

  // Classic videoRenderer / gridVideoRenderer / playlistVideoRenderer
  const v = content.videoRenderer || content.gridVideoRenderer || content.playlistVideoRenderer;
  if (v && typeof v.videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(v.videoId)) {
    const thumbnail =
      pickBestThumbnail(v.thumbnail?.thumbnails) ||
      `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

    let duration = readText(v.lengthText);
    let isLiveNow = false;
    if (!duration && Array.isArray(v.thumbnailOverlays)) {
      for (const ov of v.thumbnailOverlays) {
        const t = ov?.thumbnailOverlayTimeStatusRenderer;
        if (t) {
          duration = readText(t.text);
          if (t.style === 'LIVE') isLiveNow = true;
        }
      }
    }

    return {
      id: v.videoId,
      title: readText(v.title) || 'Untitled video',
      thumbnail,
      duration,
      viewsText: readText(v.shortViewCountText) || readText(v.viewCountText),
      publishedText: readText(v.publishedTimeText),
      type: defaultType,
      isLiveNow,
    };
  }

  // Classic reelItemRenderer (Shorts)
  if (content.reelItemRenderer) {
    const r = content.reelItemRenderer;
    const videoId = r.videoId || '';
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
    return {
      id: videoId,
      title: readText(r.headline) || 'Short',
      thumbnail:
        pickBestThumbnail(r.thumbnail?.thumbnails) ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: 'Short',
      viewsText: readText(r.viewCountText),
      publishedText: '',
      type: 'short',
    };
  }

  return null;
}

function parsePlaylistNode(content: any): PlaylistCard | null {
  if (!content || typeof content !== 'object') return null;

  if (content.lockupViewModel && content.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST') {
    const vm = content.lockupViewModel;
    const id = typeof vm.contentId === 'string' ? vm.contentId : '';
    if (!/^[a-zA-Z0-9_-]{10,64}$/.test(id)) return null;

    const primaryThumb = vm.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel;
    const thumbnail = pickBestThumbnail(primaryThumb?.image?.sources);

    let videoCountText = '';
    for (const ov of primaryThumb?.overlays || []) {
      for (const b of ov?.thumbnailOverlayBadgeViewModel?.thumbnailBadges || []) {
        const txt = b?.thumbnailBadgeViewModel?.text;
        if (typeof txt === 'string' && txt.trim()) videoCountText = txt.trim();
      }
    }

    const metaVm = vm.metadata?.lockupMetadataViewModel;
    const title = readText(metaVm?.title) || 'Playlist';
    let updatedText = '';
    for (const row of metaVm?.metadata?.contentMetadataViewModel?.metadataRows || []) {
      for (const part of row?.metadataParts || []) {
        const txt = readText(part?.text);
        if (txt && !/view full playlist/i.test(txt)) {
          updatedText = txt;
        }
      }
    }

    return {
      id,
      title,
      thumbnail,
      videoCountText: videoCountText || 'Playlist',
      updatedText,
    };
  }

  const p = content.gridPlaylistRenderer || content.playlistRenderer;
  if (p && typeof p.playlistId === 'string' && /^[a-zA-Z0-9_-]{10,64}$/.test(p.playlistId)) {
    return {
      id: p.playlistId,
      title: readText(p.title) || 'Playlist',
      thumbnail: pickBestThumbnail(p.thumbnail?.thumbnails || p.thumbnails?.[0]?.thumbnails),
      videoCountText: readText(p.videoCountText) || `${p.videoCount || ''} videos`.trim(),
      updatedText: readText(p.publishedTimeText),
    };
  }

  return null;
}

function extractItemsAndContinuation(
  rawList: any[],
  tab: ChannelTab
): {
  items: MediaItem[];
  playlists: PlaylistCard[];
  nextToken: string;
} {
  const items: MediaItem[] = [];
  const playlists: PlaylistCard[] = [];
  let nextToken = '';

  const defaultType: 'video' | 'short' | 'live' =
    tab === 'shorts' ? 'short' : tab === 'live' ? 'live' : 'video';

  for (const entry of rawList) {
    if (entry?.continuationItemRenderer) {
      const tok =
        entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (typeof tok === 'string' && tok) {
        nextToken = tok;
      }
      continue;
    }

    const inner = entry?.richItemRenderer?.content || entry;
    if (tab === 'playlists') {
      const pl = parsePlaylistNode(inner);
      if (pl) playlists.push(pl);
    } else {
      const media = parseMediaNode(inner, defaultType);
      if (media) items.push(media);
    }
  }

  return { items, playlists, nextToken };
}

function parseAboutInfo(data: Record<string, unknown>, channel: ChannelInfo): ChannelAbout {
  const endpoints = (data.onResponseReceivedEndpoints as any[]) || [];
  let vm: any = null;

  for (const ep of endpoints) {
    const contents =
      ep?.showEngagementPanelEndpoint?.engagementPanel?.engagementPanelSectionListRenderer?.content
        ?.sectionListRenderer?.contents || [];
    for (const sec of contents) {
      const items = sec?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item?.aboutChannelRenderer?.metadata?.aboutChannelViewModel) {
          vm = item.aboutChannelRenderer.metadata.aboutChannelViewModel;
          break;
        }
      }
      if (vm) break;
    }
    if (vm) break;
  }

  // Fallback inside tabRenderer content
  if (!vm) {
    const tabs = (data.contents as any)?.twoColumnBrowseResultsRenderer?.tabs || [];
    for (const t of tabs) {
      const secContents = t?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const sec of secContents) {
        const items = sec?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item?.channelAboutFullMetadataRenderer) {
            const m = item.channelAboutFullMetadataRenderer;
            return {
              description: readText(m.description) || channel.description,
              country: readText(m.country),
              joinedDateText: readText(m.joinedDateText),
              viewCountText: readText(m.viewCountText),
              subscriberCountText: channel.subscribersText,
              videoCountText: channel.videoCountText,
              links: [],
            };
          }
        }
      }
    }
  }

  const links: { title: string; url: string }[] = [];
  if (Array.isArray(vm?.links)) {
    for (const l of vm.links) {
      const linkVm = l?.channelExternalLinkViewModel;
      if (!linkVm) continue;
      const title = readText(linkVm.title);
      const rawUrl = readText(linkVm.link);
      const safeUrl = sanitizeExternalUrl(rawUrl);
      if (title && safeUrl) {
        links.push({ title, url: safeUrl });
      }
    }
  }

  return {
    description: vm?.description || channel.description || '',
    country: vm?.country || '',
    joinedDateText: readText(vm?.joinedDateText),
    viewCountText: vm?.viewCountText || '',
    subscriberCountText: vm?.subscriberCountText || channel.subscribersText,
    videoCountText: vm?.videoCountText || channel.videoCountText,
    links,
  };
}

export async function fetchChannelTab(
  rawQuery: string,
  tab: ChannelTab
): Promise<ChannelTabResponse> {
  const channelPath = await resolveChannelPath(rawQuery);
  const suffixMap: Record<ChannelTab, string> = {
    videos: '/videos',
    shorts: '/shorts',
    live: '/streams',
    playlists: '/playlists',
    about: '/about',
  };

  const html = await fetchYoutubeHtml(`${channelPath}${suffixMap[tab]}`);
  const { data, apiKey, clientVersion } = extractYtData(html);

  const channel = parseChannelInfo(data, channelPath);
  const tabs = (data.contents as any)?.twoColumnBrowseResultsRenderer?.tabs || [];
  const selectedTab = tabs.find((t: any) => t?.tabRenderer?.selected)?.tabRenderer;
  const tabContent = selectedTab?.content;

  if (tab === 'about') {
    const about = parseAboutInfo(data, channel);
    return {
      channel,
      tab,
      items: [],
      playlists: [],
      about,
      continuation: null,
    };
  }

  let rawList: any[] = [];
  if (tabContent?.richGridRenderer?.contents) {
    rawList = tabContent.richGridRenderer.contents;
  } else if (tabContent?.sectionListRenderer?.contents) {
    for (const sec of tabContent.sectionListRenderer.contents) {
      const innerContents = sec?.itemSectionRenderer?.contents || [];
      for (const inner of innerContents) {
        if (inner?.gridRenderer?.items) {
          rawList.push(...inner.gridRenderer.items);
        } else if (inner?.shelfRenderer?.content?.horizontalListRenderer?.items) {
          rawList.push(...inner.shelfRenderer.content.horizontalListRenderer.items);
        } else {
          rawList.push(inner);
        }
      }
      if (sec?.continuationItemRenderer) {
        rawList.push(sec);
      }
    }
  }

  const { items, playlists, nextToken } = extractItemsAndContinuation(rawList, tab);

  return {
    channel,
    tab,
    items,
    playlists,
    about: null,
    continuation:
      nextToken && apiKey
        ? { token: nextToken, apiKey, clientVersion }
        : null,
  };
}

export async function fetchChannelContinuation(
  continuation: ContinuationInfo,
  tab: ChannelTab
): Promise<{
  items: MediaItem[];
  playlists: PlaylistCard[];
  continuation: ContinuationInfo | null;
}> {
  const { token, apiKey, clientVersion } = continuation;
  if (!/^[a-zA-Z0-9_-]{10,80}$/.test(apiKey)) {
    throw new Error('Invalid continuation key.');
  }
  if (!/^[0-9.]{3,32}$/.test(clientVersion)) {
    throw new Error('Invalid client version.');
  }
  if (!token || token.length > 4096) {
    throw new Error('Invalid continuation token.');
  }

  const res = await fetch(`${YOUTUBE_ORIGIN}/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...REQUEST_HEADERS,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion,
          hl: 'en',
          gl: 'US',
        },
      },
      continuation: token,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Failed to load more items (${res.status}).`);
  }

  const json = (await res.json()) as any;
  const actions = json?.onResponseReceivedActions || json?.onResponseReceivedEndpoints || [];
  const rawList: any[] = [];
  for (const act of actions) {
    if (act?.appendContinuationItemsAction?.continuationItems) {
      rawList.push(...act.appendContinuationItemsAction.continuationItems);
    }
    if (act?.reloadContinuationItemsCommand?.continuationItems) {
      rawList.push(...act.reloadContinuationItemsCommand.continuationItems);
    }
  }

  const { items, playlists, nextToken } = extractItemsAndContinuation(rawList, tab);

  return {
    items,
    playlists,
    continuation: nextToken ? { token: nextToken, apiKey, clientVersion } : null,
  };
}

export async function fetchPlaylistDetail(listId: string): Promise<PlaylistDetailResponse> {
  if (!/^[a-zA-Z0-9_-]{10,64}$/.test(listId)) {
    throw new Error('Invalid playlist ID.');
  }

  const html = await fetchYoutubeHtml(`/playlist?list=${encodeURIComponent(listId)}`);
  const { data, apiKey, clientVersion } = extractYtData(html);

  const header = (data.header as any)?.playlistHeaderRenderer;
  const pageHeader = (data.header as any)?.pageHeaderRenderer;

  let title = 'Playlist';
  let author = '';
  let videoCountText = '';
  let viewsText = '';
  let description = '';

  if (header) {
    title = readText(header.title) || title;
    author = readText(header.ownerText);
    videoCountText = readText(header.numVideosText);
    viewsText = readText(header.viewCountText);
    description = readText(header.descriptionText);
  } else if (pageHeader) {
    title = pageHeader.pageTitle || title;
    const vm = pageHeader.content?.pageHeaderViewModel;
    if (vm) {
      description = vm.description?.descriptionPreviewViewModel?.description?.content || '';
      const rows = vm.metadata?.contentMetadataViewModel?.metadataRows || [];
      for (const row of rows) {
        for (const part of row?.metadataParts || []) {
          const txt = readText(part?.text);
          if (!txt) continue;
          if (/video/i.test(txt)) videoCountText = txt;
          else if (/view/i.test(txt)) viewsText = txt;
          else if (!author) author = txt;
        }
      }
    }
  }

  const sectionContents =
    (data.contents as any)?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

  const listContents: any[] = [];
  for (const entry of sectionContents) {
    if (entry?.playlistVideoListRenderer?.contents) {
      listContents.push(...entry.playlistVideoListRenderer.contents);
    } else {
      listContents.push(entry);
    }
  }

  const { items, nextToken } = extractItemsAndContinuation(listContents, 'videos');

  return {
    id: listId,
    title,
    author,
    videoCountText,
    viewsText,
    description,
    videos: items,
    continuation:
      nextToken && apiKey
        ? { token: nextToken, apiKey, clientVersion }
        : null,
  };
}
