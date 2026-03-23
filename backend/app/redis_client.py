import json
import logging

logger = logging.getLogger(__name__)

# Default TTL for dashboard cache (5 minutes)
DASHBOARD_CACHE_TTL = 300

# Try to connect to Redis, fallback to in-memory cache if unavailable
_redis_client = None
_memory_cache: dict[str, tuple[str, float]] = {}

try:
    import redis
    from app.config import get_settings

    settings = get_settings()
    _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    _redis_client.ping()
    logger.info("Redis conectado exitosamente")
except Exception as e:
    logger.warning(f"Redis no disponible ({e}). Usando caché en memoria.")
    _redis_client = None


def get_cached(key: str):
    """Get cached value. Uses Redis if available, otherwise in-memory."""
    import time as _time

    if _redis_client:
        try:
            data = _redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None
    else:
        # In-memory fallback
        if key in _memory_cache:
            value_str, expiry = _memory_cache[key]
            if _time.time() < expiry:
                return json.loads(value_str)
            else:
                del _memory_cache[key]
        return None


def set_cached(key: str, value: dict, ttl: int = DASHBOARD_CACHE_TTL):
    """Set cached value with TTL."""
    import time as _time

    data = json.dumps(value, default=str)
    if _redis_client:
        try:
            _redis_client.setex(key, ttl, data)
        except Exception:
            pass
    else:
        _memory_cache[key] = (data, _time.time() + ttl)


def invalidate_cache(pattern: str = "dashboard:*"):
    """Invalidate cache entries matching pattern."""
    if _redis_client:
        try:
            keys = _redis_client.keys(pattern)
            if keys:
                _redis_client.delete(*keys)
        except Exception:
            pass
    else:
        # In-memory: clear matching keys
        prefix = pattern.replace("*", "")
        keys_to_delete = [k for k in _memory_cache if k.startswith(prefix)]
        for k in keys_to_delete:
            del _memory_cache[k]
