import express, { type NextFunction, type Request, type Response } from 'express';

type ChannelTab = 'videos' | 'shorts' | 'live' | 'playlists' | 'about';

interface ChannelInfo {
  id: string;
  title: string;
  handle: string;
  path: string;
  url: string;
  avatar: string;
  banner: string;
  subscribersText: string;
  videoCountText: string;
  description: string;
  availableTabs: ChannelTab[];
}

interface MediaItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  viewsText: string;
  publishedText: string;
  type: 'video' | 'short' | 'live';
  isLiveNow?: boolean;
  channelTitle?: string;
  channelPath?: string;
}

interface PlaylistCard {
  id: string;
  title: string;
  thumbnail: string;
  videoCountText: string;
  updatedText: string;
}

interface ChannelAbout {
  description: string;
  country: string;
  joinedDateText: string;
  viewCountText: string;
  subscriberCountText: string;
  videoCountText: string;
  links: { title: string; url: string }[];
}

interface ContinuationInfo {
  token: string;
  apiKey: string;
  clientVersion: string;
}

interface ChannelSearchResult {
  id: string;
  title: string;
  handle: string;
  path: string;
  avatar: string;
  subscribersText: string;
  description: string;
}

const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const ALLOWED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com']);
const DEFAULT_CLIENT_VERSION = '2.20261123.00.00';

const HTML_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'SOCS=CAI',
};

const INNERTUBE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: YOUTUBE_ORIGIN,
  Referer: `${YOUTUBE_ORIGIN}/`,
  Cookie: 'SOCS=CAI',
};

const TAB_DEFAULT_PARAMS: Record<Exclude<ChannelTab, 'about'>, string> = {
  videos: 'EgZ2aWRlb3PyBgQKAjoA',
  shorts: 'EgZzaG9ydHPyBgUKA5oBAA%3D%3D',
  live: 'EgdzdHJlYW1z8gYECgJ6AA%3D%3D',
  playlists: 'EglwbGF5bGlzdHPyBgoKCEIGCgIQaCIA',
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
      .map((r) =>
        typeof (r as { text?: unknown }).text === 'string' ? (r as { text: string }).text : ''
      )
      .join('');
  }
  return '';
}

async function callInnerTube(
  endpoint: string,
  payload: Record<string, unknown>,
  apiKey = '',
  clientVersion = DEFAULT_CLIENT_VERSION
): Promise<any> {
  const qs = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '?prettyPrint=false';
  const res = await fetch(`${YOUTUBE_ORIGIN}/youtubei/v1/${endpoint}${qs}`, {
    method: 'POST',
    headers: INNERTUBE_HEADERS,
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: clientVersion || DEFAULT_CLIENT_VERSION,
          hl: 'en',
          gl: 'US',
        },
      },
      ...payload,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`YouTube API returned status ${res.status}`);
  }
  return res.json();
}

async function fetchYoutubeHtml(pathAndQuery: string): Promise<string> {
  const url = `${YOUTUBE_ORIGIN}${pathAndQuery}`;
  const res = await fetch(url, {
    headers: HTML_HEADERS,
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
  let clientVersion = DEFAULT_CLIENT_VERSION;
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

function normalizeCandidatePath(rawQuery: string): { path: string; browseId?: string; isNameQuery?: boolean } {
  const q = rawQuery.trim();
  if (!q) {
    throw new Error('Please enter a channel name, @handle, or YouTube URL.');
  }

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
      return { path: `/${handle}` };
    }
    if (segments[0] === 'channel' && segments[1] && /^UC[a-zA-Z0-9_-]{18,32}$/.test(segments[1])) {
      return { path: `/channel/${segments[1]}`, browseId: segments[1] };
    }
    if ((segments[0] === 'c' || segments[0] === 'user') && segments[1]) {
      const cleanName = segments[1].replace(/[^a-zA-Z0-9._-]/g, '');
      if (cleanName) return { path: `/${segments[0]}/${cleanName}` };
    }
    const legacy = segments[0].replace(/[^a-zA-Z0-9._-]/g, '');
    if (legacy && !['watch', 'shorts', 'playlist', 'results', 'feed'].includes(legacy.toLowerCase())) {
      return { path: `/@${legacy}` };
    }
    throw new Error('Could not detect a channel from that URL. Try a channel URL like youtube.com/@Fireship.');
  }

  if (q.startsWith('@')) {
    const cleanHandle = q.replace(/[^a-zA-Z0-9._@-]/g, '');
    if (cleanHandle.length < 2) throw new Error('Invalid channel handle.');
    return { path: `/${cleanHandle}` };
  }

  if (/^UC[a-zA-Z0-9_-]{20,30}$/.test(q)) {
    return { path: `/channel/${q}`, browseId: q };
  }

  return { path: '', isNameQuery: true };
}

async function resolveChannelTarget(rawQuery: string): Promise<{ path: string; browseId: string }> {
  const norm = normalizeCandidatePath(rawQuery);
  if (norm.browseId) {
    return { path: norm.path, browseId: norm.browseId };
  }

  if (norm.isNameQuery) {
    const results = await searchChannels(rawQuery);
    if (results.length > 0) {
      const first = results[0];
      const id = /^UC[a-zA-Z0-9_-]{18,32}$/.test(first.id) ? first.id : '';
      return { path: first.path, browseId: id };
    }
    const handleGuess = rawQuery.trim().replace(/[^a-zA-Z0-9._-]/g, '');
    if (handleGuess.length >= 2) {
      norm.path = `/@${handleGuess}`;
    } else {
      throw new Error(`No channel found matching "${rawQuery}".`);
    }
  }

  try {
    const resolved = await callInnerTube('navigation/resolve_url', {
      url: `${YOUTUBE_ORIGIN}${norm.path}`,
    });
    const browseId = resolved?.endpoint?.browseEndpoint?.browseId;
    if (typeof browseId === 'string' && /^UC[a-zA-Z0-9_-]{18,32}$/.test(browseId)) {
      return { path: norm.path, browseId };
    }
  } catch {
    // Fallback to HTML path below
  }

  return { path: norm.path, browseId: '' };
}

async function searchChannels(query: string): Promise<ChannelSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) return [];

  let data: Record<string, unknown>;
  try {
    data = await callInnerTube('search', {
      query: trimmed,
      params: 'EgIQAg%3D%3D',
    });
  } catch {
    const html = await fetchYoutubeHtml(
      `/results?search_query=${encodeURIComponent(trimmed)}&sp=EgIQAg%3D%3D`
    );
    data = extractYtData(html).data;
  }

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
    let channelTitle = '';
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
        } else if (/\d/.test(txt) || /view/i.test(txt)) {
          if (!viewsText) viewsText = /view/i.test(txt) ? txt : `${txt} views`;
        } else if (!channelTitle && !publishedText) {
          channelTitle = txt;
        } else if (!publishedText) {
          publishedText = txt;
        }
      }
    }

    const avatarNav =
      metaVm?.image?.decoratedAvatarViewModel?.rendererContext?.commandContext?.onTap
        ?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url;
    const channelPath =
      typeof avatarNav === 'string' && avatarNav.startsWith('/') ? avatarNav : undefined;

    return {
      id: videoId,
      title,
      thumbnail,
      duration,
      viewsText,
      publishedText,
      type: defaultType,
      isLiveNow,
      ...(channelTitle ? { channelTitle } : {}),
      ...(channelPath ? { channelPath } : {}),
    };
  }

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

    const bylineNode = v.ownerText || v.longBylineText || v.shortBylineText;
    const channelTitle = readText(bylineNode);
    const bylineUrl =
      bylineNode?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
    const channelPath =
      typeof bylineUrl === 'string' && bylineUrl.startsWith('/') ? bylineUrl : undefined;

    return {
      id: v.videoId,
      title: readText(v.title) || 'Untitled video',
      thumbnail,
      duration,
      viewsText: readText(v.shortViewCountText) || readText(v.viewCountText),
      publishedText: readText(v.publishedTimeText),
      type: defaultType,
      isLiveNow,
      ...(channelTitle ? { channelTitle } : {}),
      ...(channelPath ? { channelPath } : {}),
    };
  }

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

    const primaryThumb =
      vm.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel;
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
      const tok = entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
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

function collectRawTabList(tabContent: any): any[] {
  const rawList: any[] = [];
  if (tabContent?.richGridRenderer?.contents) {
    return tabContent.richGridRenderer.contents;
  }
  if (tabContent?.sectionListRenderer?.contents) {
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
  return rawList;
}

async function fetchChannelTab(rawQuery: string, tab: ChannelTab) {
  const target = await resolveChannelTarget(rawQuery);
  const suffixMap: Record<ChannelTab, string> = {
    videos: '/videos',
    shorts: '/shorts',
    live: '/streams',
    playlists: '/playlists',
    about: '/about',
  };

  let data: Record<string, unknown> | null = null;
  let apiKey = '';
  let clientVersion = DEFAULT_CLIENT_VERSION;

  if (tab !== 'about' && target.browseId) {
    try {
      const defaultParam = TAB_DEFAULT_PARAMS[tab];
      let resData = await callInnerTube('browse', {
        browseId: target.browseId,
        params: defaultParam,
      });

      const tabs = (resData?.contents as any)?.twoColumnBrowseResultsRenderer?.tabs || [];
      const wantedTitle = tab.toLowerCase();
      const matchedTab = tabs.find(
        (t: any) => (t?.tabRenderer?.title || '').toLowerCase() === wantedTitle
      )?.tabRenderer;

      const selectedTab = tabs.find((t: any) => t?.tabRenderer?.selected)?.tabRenderer;
      if (
        matchedTab &&
        (!selectedTab || (selectedTab.title || '').toLowerCase() !== wantedTitle) &&
        matchedTab.endpoint?.browseEndpoint?.params
      ) {
        resData = await callInnerTube('browse', {
          browseId: target.browseId,
          params: matchedTab.endpoint.browseEndpoint.params,
        });
      }

      data = resData;
    } catch {
      data = null;
    }
  }

  if (!data) {
    try {
      const htmlPath = target.path || `/channel/${target.browseId}`;
      const html = await fetchYoutubeHtml(`${htmlPath}${suffixMap[tab]}`);
      const extracted = extractYtData(html);
      data = extracted.data;
      apiKey = extracted.apiKey;
      clientVersion = extracted.clientVersion;
    } catch (htmlErr) {
      if (tab === 'about' && target.browseId) {
        data = await callInnerTube('browse', { browseId: target.browseId });
      } else {
        throw htmlErr;
      }
    }
  }

  if (!data) {
    throw new Error('Unable to load channel data.');
  }

  const fallbackPath = target.path || `/channel/${target.browseId}`;
  const channel = parseChannelInfo(data, fallbackPath);
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

  const rawList = collectRawTabList(tabContent);
  const { items, playlists, nextToken } = extractItemsAndContinuation(rawList, tab);

  return {
    channel,
    tab,
    items,
    playlists,
    about: null,
    continuation: nextToken ? { token: nextToken, apiKey, clientVersion } : null,
  };
}

async function fetchChannelContinuation(continuation: ContinuationInfo, tab: ChannelTab) {
  const { token, apiKey, clientVersion } = continuation;
  if (apiKey && !/^[a-zA-Z0-9_-]{10,80}$/.test(apiKey)) {
    throw new Error('Invalid continuation key.');
  }
  if (clientVersion && !/^[0-9.]{3,32}$/.test(clientVersion)) {
    throw new Error('Invalid client version.');
  }
  if (!token || token.length > 4096) {
    throw new Error('Invalid continuation token.');
  }

  const json = await callInnerTube('browse', { continuation: token }, apiKey, clientVersion);
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
    continuation: nextToken
      ? { token: nextToken, apiKey, clientVersion: clientVersion || DEFAULT_CLIENT_VERSION }
      : null,
  };
}

async function fetchPlaylistDetail(listId: string) {
  if (!/^[a-zA-Z0-9_-]{10,64}$/.test(listId)) {
    throw new Error('Invalid playlist ID.');
  }

  let data: Record<string, unknown> | null = null;
  let apiKey = '';
  let clientVersion = DEFAULT_CLIENT_VERSION;

  try {
    const html = await fetchYoutubeHtml(`/playlist?list=${encodeURIComponent(listId)}`);
    const extracted = extractYtData(html);
    data = extracted.data;
    apiKey = extracted.apiKey;
    clientVersion = extracted.clientVersion;
  } catch {
    data = await callInnerTube('browse', { browseId: `VL${listId}` });
  }

  const header = (data?.header as any)?.playlistHeaderRenderer;
  const pageHeader = (data?.header as any)?.pageHeaderRenderer;

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
    (data?.contents as any)?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
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
    continuation: nextToken ? { token: nextToken, apiKey, clientVersion } : null,
  };
}

async function searchVideos(query: string, limit = 20): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) return [];

  let data: Record<string, unknown>;
  try {
    data = await callInnerTube('search', {
      query: trimmed,
      params: 'EgIQAQ%3D%3D',
    });
  } catch {
    const html = await fetchYoutubeHtml(
      `/results?search_query=${encodeURIComponent(trimmed)}&sp=EgIQAQ%3D%3D`
    );
    data = extractYtData(html).data;
  }

  const sections =
    (data.contents as any)?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
      ?.contents || [];

  const results: MediaItem[] = [];
  const seen = new Set<string>();

  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const parsed = parseMediaNode(item, 'video');
      if (!parsed || seen.has(parsed.id)) continue;
      seen.add(parsed.id);
      results.push(parsed);
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  return results;
}

async function searchAllVideos(query: string, includeChannels = true) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) {
    return { query: trimmed, videos: [], channels: [], continuation: null };
  }

  const videoPromise = (async () => {
    let data: Record<string, unknown>;
    let apiKey = '';
    let clientVersion = DEFAULT_CLIENT_VERSION;

    try {
      data = await callInnerTube('search', {
        query: trimmed,
        params: 'EgIQAQ%3D%3D',
      });
    } catch {
      const html = await fetchYoutubeHtml(
        `/results?search_query=${encodeURIComponent(trimmed)}&sp=EgIQAQ%3D%3D`
      );
      const extracted = extractYtData(html);
      data = extracted.data;
      apiKey = extracted.apiKey;
      clientVersion = extracted.clientVersion;
    }

    const sections =
      (data.contents as any)?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const videos: MediaItem[] = [];
    const seen = new Set<string>();
    let nextToken = '';

    for (const sec of sections) {
      if (sec?.continuationItemRenderer) {
        const tok =
          sec.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (typeof tok === 'string' && tok) nextToken = tok;
        continue;
      }

      const items = sec?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const parsed = parseMediaNode(item, 'video');
        if (!parsed || seen.has(parsed.id)) continue;
        seen.add(parsed.id);
        videos.push(parsed);
      }
    }

    return {
      videos,
      continuation: nextToken ? { token: nextToken, apiKey, clientVersion } : null,
    };
  })();

  const channelPromise = includeChannels
    ? searchChannels(trimmed).catch(() => [])
    : Promise.resolve([]);

  const [videoRes, channels] = await Promise.all([videoPromise, channelPromise]);

  return {
    query: trimmed,
    videos: videoRes.videos,
    channels: channels.slice(0, 4),
    continuation: videoRes.continuation,
  };
}

async function fetchSearchContinuation(continuation: ContinuationInfo) {
  const { token, apiKey, clientVersion } = continuation;
  if (apiKey && !/^[a-zA-Z0-9_-]{10,80}$/.test(apiKey)) {
    throw new Error('Invalid continuation key.');
  }
  if (clientVersion && !/^[0-9.]{3,32}$/.test(clientVersion)) {
    throw new Error('Invalid client version.');
  }
  if (!token || token.length > 4096) {
    throw new Error('Invalid continuation token.');
  }

  const json = await callInnerTube('search', { continuation: token }, apiKey, clientVersion);
  const cmds = json?.onResponseReceivedCommands || json?.onResponseReceivedActions || [];

  const videos: MediaItem[] = [];
  const seen = new Set<string>();
  let nextToken = '';

  for (const cmd of cmds) {
    const entries = cmd?.appendContinuationItemsAction?.continuationItems || [];
    for (const entry of entries) {
      if (entry?.continuationItemRenderer) {
        const tok =
          entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (typeof tok === 'string' && tok) nextToken = tok;
        continue;
      }
      const items = entry?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const parsed = parseMediaNode(item, 'video');
        if (!parsed || seen.has(parsed.id)) continue;
        seen.add(parsed.id);
        videos.push(parsed);
      }
    }
  }

  return {
    videos,
    continuation: nextToken
      ? { token: nextToken, apiKey, clientVersion: clientVersion || DEFAULT_CLIENT_VERSION }
      : null,
  };
}

const DEFAULT_FEED_SEEDS = [
  'latest hit songs music',
  'lofi chill beats mix',
  'trending tech explained',
  'live acoustic music session',
];

async function fetchPersonalizedFeed(rawSeeds: string[], excludeIds: Set<string>) {
  const cleanedSeeds = rawSeeds
    .map((s) => s.trim().slice(0, 80))
    .filter((s) => s.length >= 2);

  const seedsUsed =
    cleanedSeeds.length > 0 ? cleanedSeeds.slice(0, 4) : DEFAULT_FEED_SEEDS.slice(0, 4);

  const settled = await Promise.allSettled(seedsUsed.map((seed) => searchVideos(seed, 12)));
  const buckets: MediaItem[][] = settled.map((res) =>
    res.status === 'fulfilled' ? res.value : []
  );

  const merged: MediaItem[] = [];
  const seen = new Set<string>(excludeIds);
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));

  for (let i = 0; i < maxLen; i += 1) {
    for (const bucket of buckets) {
      const vid = bucket[i];
      if (!vid || seen.has(vid.id)) continue;
      seen.add(vid.id);
      merged.push(vid);
      if (merged.length >= 40) break;
    }
    if (merged.length >= 40) break;
  }

  return { items: merged, seedsUsed };
}

const VALID_TABS = new Set<ChannelTab>(['videos', 'shorts', 'live', 'playlists', 'about']);

const apiApp = express();
apiApp.use(express.json({ limit: '64kb' }));

apiApp.use((req: Request, _res: Response, next: NextFunction) => {
  const vpath = req.query.__vpath;
  if (typeof vpath === 'string' && vpath.trim()) {
    const cleanSubpath = vpath.replace(/^\/+/, '');
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(req.query)) {
      if (k === '__vpath') continue;
      if (Array.isArray(val)) {
        for (const item of val) params.append(k, String(item));
      } else if (val !== undefined) {
        params.append(k, String(val));
      }
    }
    const qs = params.toString();
    req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
  }
  next();
});

apiApp.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

apiApp.get('/api/search-channels', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ results: [] });
    }
    if (q.length > 100) {
      return res.status(400).json({ error: 'Search query is too long.' });
    }
    const results = await searchChannels(q);
    return res.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search channels.';
    return res.status(500).json({ error: message });
  }
});

apiApp.get('/api/search-videos', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const includeChannels = req.query.channels !== '0';
    if (!q) {
      return res.json({ query: '', videos: [], channels: [], continuation: null });
    }
    if (q.length > 100) {
      return res.status(400).json({ error: 'Search query is too long.' });
    }
    const data = await searchAllVideos(q, includeChannels);
    return res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search videos.';
    return res.status(500).json({ error: message });
  }
});

apiApp.post('/api/search-videos/more', async (req: Request, res: Response) => {
  try {
    const { continuation } = req.body ?? {};
    if (
      !continuation ||
      typeof continuation.token !== 'string' ||
      (continuation.apiKey !== undefined && typeof continuation.apiKey !== 'string') ||
      (continuation.clientVersion !== undefined && typeof continuation.clientVersion !== 'string')
    ) {
      return res.status(400).json({ error: 'Missing pagination parameters.' });
    }
    const data = await fetchSearchContinuation({
      token: continuation.token,
      apiKey: continuation.apiKey || '',
      clientVersion: continuation.clientVersion || DEFAULT_CLIENT_VERSION,
    });
    return res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load more results.';
    return res.status(400).json({ error: message });
  }
});

apiApp.get('/api/channel', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const rawTab = typeof req.query.tab === 'string' ? req.query.tab.toLowerCase() : 'videos';
    const tab: ChannelTab = VALID_TABS.has(rawTab as ChannelTab)
      ? (rawTab as ChannelTab)
      : 'videos';

    if (!q) {
      return res.status(400).json({ error: 'Please enter a channel name, @handle, or URL.' });
    }
    if (q.length > 300) {
      return res.status(400).json({ error: 'Channel query is too long.' });
    }

    const data = await fetchChannelTab(q, tab);
    return res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load channel.';
    return res.status(400).json({ error: message });
  }
});

apiApp.post('/api/channel/more', async (req: Request, res: Response) => {
  try {
    const { continuation, tab } = req.body ?? {};
    const safeTab: ChannelTab = VALID_TABS.has(tab) ? tab : 'videos';
    if (
      !continuation ||
      typeof continuation.token !== 'string' ||
      (continuation.apiKey !== undefined && typeof continuation.apiKey !== 'string') ||
      (continuation.clientVersion !== undefined && typeof continuation.clientVersion !== 'string')
    ) {
      return res.status(400).json({ error: 'Missing pagination parameters.' });
    }

    const data = await fetchChannelContinuation(
      {
        token: continuation.token,
        apiKey: continuation.apiKey || '',
        clientVersion: continuation.clientVersion || DEFAULT_CLIENT_VERSION,
      },
      safeTab
    );
    return res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load more videos.';
    return res.status(400).json({ error: message });
  }
});

apiApp.get('/api/playlist', async (req: Request, res: Response) => {
  try {
    const listId = typeof req.query.list === 'string' ? req.query.list.trim() : '';
    if (!listId) {
      return res.status(400).json({ error: 'Missing playlist ID.' });
    }
    const data = await fetchPlaylistDetail(listId);
    return res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load playlist.';
    return res.status(400).json({ error: message });
  }
});

apiApp.get('/api/feed', async (req: Request, res: Response) => {
  try {
    const rawSeeds = typeof req.query.seeds === 'string' ? req.query.seeds : '';
    const rawExclude = typeof req.query.exclude === 'string' ? req.query.exclude : '';

    const seeds = rawSeeds
      .split('||')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const excludeIds = new Set(
      rawExclude
        .split(',')
        .map((id) => id.trim())
        .filter((id) => /^[a-zA-Z0-9_-]{11}$/.test(id))
    );

    const data = await fetchPersonalizedFeed(seeds, excludeIds);
    return res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load feed.';
    return res.status(500).json({ error: message });
  }
});

apiApp.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

apiApp.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error.';
  res.status(500).json({ error: message });
});

export default apiApp;
