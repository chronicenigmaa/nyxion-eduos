import os
import threading
import queue
from datetime import datetime, timezone

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SERVICE_NAME = os.getenv("SERVICE_NAME", "learnspace")

_LOG_ENDPOINT = f"{SUPABASE_URL}/rest/v1/app_logs" if SUPABASE_URL else ""
_log_queue: "queue.Queue[dict]" = queue.Queue(maxsize=1000)


def _worker():
    # Background thread: never let logging block or crash a request.
    with httpx.Client(timeout=5.0) as client:
        while True:
            record = _log_queue.get()
            if record is None:
                break
            try:
                client.post(
                    _LOG_ENDPOINT,
                    headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json=record,
                )
            except Exception:
                pass  # logging must not raise
            finally:
                _log_queue.task_done()


if _LOG_ENDPOINT and SUPABASE_SERVICE_KEY:
    threading.Thread(target=_worker, daemon=True).start()


def log_event(level: str, event: str, **fields):
    if not _LOG_ENDPOINT or not SUPABASE_SERVICE_KEY:
        return
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "service": SERVICE_NAME,
        "level": level,
        "event": event,
    }
    for key in ("user_id", "role", "method", "path", "status_code", "duration_ms", "ip"):
        if key in fields:
            record[key] = fields.pop(key)
    if fields:
        record["detail"] = fields
    try:
        _log_queue.put_nowait(record)
    except queue.Full:
        pass  # drop logs rather than block under load