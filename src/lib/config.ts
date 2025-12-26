export const REDIS_URL = process.env.REDIS_URL || '';
export const REDIS_TLS_URL = process.env.REDIS_TLS_URL || '';

/**
 * Retorna a URL do Redis a ser usada. Prefere `REDIS_TLS_URL` se definida,
 * depois `REDIS_URL` e por fim um fallback local.
 */
export function getRedisUrl(): string {
  return REDIS_TLS_URL || REDIS_URL || 'redis://127.0.0.1:6379';
}

export default {
  REDIS_URL,
  REDIS_TLS_URL,
  getRedisUrl,
};
