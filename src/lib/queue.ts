import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function connectRedis(url?: string) {
  if (redisClient) return redisClient;
  redisClient = new Redis(url || process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  redisClient.on('error', (err) => console.error('Redis error', err));
  return redisClient;
}

/** Ensure a consumer group exists for a stream. */
export async function ensureGroup(stream: string, group: string) {
  const r = connectRedis();
  try {
    await r.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
  } catch (e: any) {
    // ignore if group exists
    if (!/BUSYGROUP/.test(e.message || '')) {
      throw e;
    }
  }
}

export async function enqueueTask(stream: string, data: Record<string, any>) {
  const r = connectRedis();
  const flat: string[] = [];
  for (const k of Object.keys(data)) {
    flat.push(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
  }
  return r.xadd(stream, '*', ...flat);
}

export async function readGroup(stream: string, group: string, consumer: string, count = 1, block = 5000) {
  const r = connectRedis();
  // XREADGROUP GROUP <group> <consumer> BLOCK <ms> COUNT <count> STREAMS <stream> >
  const res = await r.xreadgroup('GROUP', group, consumer, 'BLOCK', block, 'COUNT', count, 'STREAMS', stream, '>');
  return res; // raw response to be parsed by caller
}

export async function ack(stream: string, group: string, id: string) {
  const r = connectRedis();
  return r.xack(stream, group, id);
}
