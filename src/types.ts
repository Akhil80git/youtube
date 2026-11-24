export type ChannelTab = 'videos' | 'shorts' | 'live' | 'playlists' | 'about';

export interface ChannelInfo {
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

export interface MediaItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  viewsText: string;
  publishedText: string;
  type: 'video' | 'short' | 'live';
  isLiveNow?: boolean;
  channelTitle?: string;
}

export interface LikedItem extends MediaItem {
  likedAt: number;
}

export interface PlaylistCard {
  id: string;
  title: string;
  thumbnail: string;
  videoCountText: string;
  updatedText: string;
}

export interface ChannelAbout {
  description: string;
  country: string;
  joinedDateText: string;
  viewCountText: string;
  subscriberCountText: string;
  videoCountText: string;
  links: { title: string; url: string }[];
}

export interface ContinuationInfo {
  token: string;
  apiKey: string;
  clientVersion: string;
}

export interface ChannelTabResponse {
  channel: ChannelInfo;
  tab: ChannelTab;
  items: MediaItem[];
  playlists: PlaylistCard[];
  about: ChannelAbout | null;
  continuation: ContinuationInfo | null;
}

export interface PlaylistDetailResponse {
  id: string;
  title: string;
  author: string;
  videoCountText: string;
  viewsText: string;
  description: string;
  videos: MediaItem[];
  continuation: ContinuationInfo | null;
}

export interface ChannelSearchResult {
  id: string;
  title: string;
  handle: string;
  path: string;
  avatar: string;
  subscribersText: string;
  description: string;
}
