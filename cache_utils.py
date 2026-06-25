import time
import threading
from functools import wraps


def ttl_cache(ttl_seconds=300, max_entries=600):
    """
    Basit, thread-safe, zaman (TTL) tabanlı in-memory cache decorator.

    Bellek yönetimi:
      - Süresi dolan kayıtlar yazma sırasında temizlenir (eskiden bellekte kalıyordu).
      - Kayıt sayısı max_entries'i aşarsa en eski kayıtlar atılır.
    Bu sayede 500+ sembol taransa bile bellek TTL penceresiyle sınırlı kalır.
    """
    def decorator(func):
        cache = {}
        lock = threading.Lock()

        def _purge(now):
            # Süresi dolanları sil
            expired = [k for k, (_, ts) in cache.items() if now - ts >= ttl_seconds]
            for k in expired:
                cache.pop(k, None)
            # Hâlâ çok büyükse en eski kayıtları at
            if len(cache) > max_entries:
                for k, _ in sorted(cache.items(), key=lambda kv: kv[1][1])[: len(cache) - max_entries]:
                    cache.pop(k, None)

        @wraps(func)
        def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)

            with lock:
                if key in cache:
                    result, timestamp = cache[key]
                    if time.time() - timestamp < ttl_seconds:
                        return result

            # Cache'de yoksa veya süresi dolduysa fonksiyonu çalıştır
            result = func(*args, **kwargs)

            now = time.time()
            with lock:
                cache[key] = (result, now)
                _purge(now)

            return result

        return wrapper
    return decorator
