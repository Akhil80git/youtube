import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchChannelContinuation,
  fetchChannelTab,
  fetchPersonalizedFeed,
  fetchPlaylistDetail,
  fetchSearchContinuation,
  searchAllVideos,
  searchChannels,
} from './server/youtube.ts';
import type { ChannelTab } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_TABS = new Set<ChannelTab>(['videos', 'shorts', 'live', 'playlists', 'about']);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/search-channels', async (req, res) => {
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

  app.get('/api/search-videos', async (req, res) => {
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

  app.post('/api/search-videos/more', async (req, res) => {
    try {
      const { continuation } = req.body ?? {};
      if (
        !continuation ||
        typeof continuation.token !== 'string' ||
        typeof continuation.apiKey !== 'string' ||
        typeof continuation.clientVersion !== 'string'
      ) {
        return res.status(400).json({ error: 'Missing pagination parameters.' });
      }
      const data = await fetchSearchContinuation(continuation);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load more results.';
      return res.status(400).json({ error: message });
    }
  });

  app.get('/api/channel', async (req, res) => {
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

  app.post('/api/channel/more', async (req, res) => {
    try {
      const { continuation, tab } = req.body ?? {};
      const safeTab: ChannelTab = VALID_TABS.has(tab) ? tab : 'videos';
      if (
        !continuation ||
        typeof continuation.token !== 'string' ||
        typeof continuation.apiKey !== 'string' ||
        typeof continuation.clientVersion !== 'string'
      ) {
        return res.status(400).json({ error: 'Missing pagination parameters.' });
      }

      const data = await fetchChannelContinuation(continuation, safeTab);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load more videos.';
      return res.status(400).json({ error: message });
    }
  });

  app.get('/api/playlist', async (req, res) => {
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

  app.get('/api/feed', async (req, res) => {
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

  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ChannelPlay server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
