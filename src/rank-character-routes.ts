import type { Hono } from 'hono';
import type { Env } from './types';

const RANKS = ['Rookie', 'Explorer', 'Pro', 'Elite', 'Master', 'Legend', 'Titan'];
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=604800';

export function registerRankCharacterRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get('/app/api/rank-character/:rank', async (c) => {
    const rank = cleanRank(c.req.param('rank'));
    if (!rank) return new Response('', { status: 204, headers: { 'cache-control': 'no-store' } });
    const object = await c.env.ASSETS.get(rankCharacterKey(rank)).catch(() => null);
    if (!object) return new Response('', { status: 204, headers: { 'cache-control': 'no-store' } });
    return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType || 'image/png', 'cache-control': CACHE_CONTROL } });
  });
}

function rankCharacterKey(rank: string): string {
  return `rank-character/${rank}`;
}

function cleanRank(value: unknown): string {
  const raw = String(value || '').replace(/\.png$/i, '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 40);
  return RANKS.includes(raw) ? raw : '';
}
