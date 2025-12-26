import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

function parseRedisUrl(raw: string | undefined) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const useTls = u.protocol === 'rediss:';
    const username = u.username || 'default';
    const password = u.password || undefined;
    const host = u.hostname;
    const port = u.port ? Number(u.port) : (useTls ? 6379 : 6379);

    return { username, password, host, port, useTls };
  } catch (e) {
    return null;
  }
}

export function getNodeRedisClient(): RedisClientType {
  if (client) return client;

  const raw = process.env.REDIS_TLS_URL || process.env.REDIS_URL;
  const parsed = parseRedisUrl(raw);

  if (parsed) {
    const socket: any = { host: parsed.host, port: parsed.port };
    if (parsed.useTls) socket.tls = {}; // enable TLS with default options

    client = createClient({
      username: parsed.username,
      password: parsed.password,
      socket,
    });
  } else {
    // fallback to default localhost
    client = createClient();
  }

  client.on('error', (err) => console.error('Redis Client Error', err));
  return client;
}

export async function connectNodeRedis(): Promise<RedisClientType> {
  const c = getNodeRedisClient();
  if (!c.isOpen) await c.connect();
  return c;
}

export default { getNodeRedisClient, connectNodeRedis };
