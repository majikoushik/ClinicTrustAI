"""
Phase 2 — Feature Store: Redis-backed Feature Cache
====================================================
Problem: Training-Serving Skew
  Training pipeline:  reads raw MongoDB documents → computes 45 features → trains XGBoost
  Serving pipeline:   receives feature dict from Express API → predicts immediately
  These two paths compute features DIFFERENTLY over time as business logic drifts.
  Result: model sees different feature distributions in production vs training → silent degradation.

Solution: centralised feature store
  1. After each training run, write all computed patient features to Redis
  2. Kafka consumer writes fresh features every time a patient document changes
  3. FastAPI serving reads from Redis first — guaranteed same computation path as training
  4. Redis miss → fallback to on-the-fly computation (new patients, cache expiry)

Why Redis specifically?
  - Sub-millisecond reads: P99 < 1ms for a single key lookup (vs 5-50ms MongoDB query)
  - TTL: features auto-expire after 1 hour, forcing recomputation from fresh data
  - Atomic writes: no partial feature vectors served to the model
  - Pub/Sub: can also be used as a lightweight event bus (not used here, but available)

Schema:
  Key:   features:patient:{patient_id}
  Value: JSON-encoded feature dict (all 45+ model features)
  TTL:   REDIS_FEATURE_TTL seconds (default 3600 = 1 hour)

  Key:   dedup:patient:{patient_id}
  Value: "1"
  TTL:   60 seconds (deduplication window for Kafka consumer)

Usage:
    from feature_store.redis_store import FeatureStore
    store = FeatureStore()

    # Write features for one patient
    store.write("PT-ML-0001", {"age": 74, "egfr_latest": 34.0, ...})

    # Read back at serving time
    features = store.read("PT-ML-0001")  # returns dict or None on miss

    # Populate from full training Parquet (run after each training cycle)
    store.batch_populate(Path("ml/data/features/patient_features.parquet"))

    # Invalidate on patient update (called by Kafka consumer)
    store.invalidate("PT-ML-0001")
"""

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class FeatureStore:
    """
    Redis-backed feature cache with graceful fallback.

    All methods degrade gracefully when Redis is unavailable —
    the serving layer continues to work, just without the caching benefit.
    This is critical: a Redis outage must never take down model serving.
    """

    FEATURE_PREFIX = "features:patient:"
    DEDUP_PREFIX   = "dedup:patient:"

    def __init__(
        self,
        host:     str = "localhost",
        port:     int = 6379,
        password: str = "",
        db:       int = 0,
        ttl:      int = 3600,
    ):
        self.ttl = ttl
        self._client = None
        self._available = False
        self._connect(host, port, password, db)

    def _connect(self, host: str, port: int, password: str, db: int):
        try:
            import redis
            client = redis.Redis(
                host=host, port=port,
                password=password or None,
                db=db,
                socket_connect_timeout=2,
                socket_timeout=2,
                decode_responses=True,
            )
            client.ping()
            self._client = client
            self._available = True
            logger.info(f"Feature store connected to Redis at {host}:{port}")
        except Exception as e:
            logger.warning(
                f"Redis unavailable ({e}). Feature store running in fallback mode — "
                "serving will recompute features on each request."
            )
            self._available = False

    # ── Public API ────────────────────────────────────────────────────────────

    def write(self, patient_id: str, features: dict) -> bool:
        """
        Store a feature vector for one patient.
        Returns True on success, False if Redis is unavailable.
        """
        if not self._available:
            return False
        try:
            key   = self.FEATURE_PREFIX + patient_id
            value = json.dumps(features, default=str)
            self._client.setex(key, self.ttl, value)
            return True
        except Exception as e:
            logger.warning(f"Feature store write failed for {patient_id}: {e}")
            return False

    def read(self, patient_id: str) -> Optional[dict]:
        """
        Retrieve the cached feature vector for one patient.
        Returns None on cache miss or Redis unavailable (caller must recompute).
        """
        if not self._available:
            return None
        try:
            key  = self.FEATURE_PREFIX + patient_id
            raw  = self._client.get(key)
            return json.loads(raw) if raw else None
        except Exception as e:
            logger.warning(f"Feature store read failed for {patient_id}: {e}")
            return None

    def invalidate(self, patient_id: str) -> bool:
        """
        Delete cached features for a patient (called when their record changes).
        Forces fresh computation on next serving request.
        """
        if not self._available:
            return False
        try:
            self._client.delete(self.FEATURE_PREFIX + patient_id)
            return True
        except Exception:
            return False

    def set_dedup(self, patient_id: str, ttl_seconds: int = 60) -> bool:
        """
        Set a deduplication flag so the Kafka consumer doesn't re-score
        the same patient multiple times within the TTL window.
        Returns False if the key already exists (duplicate — skip processing).
        """
        if not self._available:
            return True  # fail-open: always process if Redis unavailable
        try:
            key = self.DEDUP_PREFIX + patient_id
            # NX = only set if Not eXists; returns True only on first set
            result = self._client.set(key, "1", ex=ttl_seconds, nx=True)
            return result is True
        except Exception:
            return True  # fail-open

    def batch_populate(self, parquet_path: Path, id_col: str = "patient_id") -> int:
        """
        Populate the feature store from a full training Parquet file.
        Call this after every training run to pre-warm the cache.

        Returns the number of patients written.
        """
        if not self._available:
            logger.warning("Redis unavailable — batch populate skipped.")
            return 0

        try:
            import pandas as pd
            df = pd.read_parquet(parquet_path)
        except Exception as e:
            logger.error(f"Could not load Parquet for batch populate: {e}")
            return 0

        if id_col not in df.columns:
            logger.warning(f"ID column '{id_col}' not in Parquet — skipping batch populate.")
            return 0

        label_cols = [c for c in ["risk_score", "outcome_score"] if c in df.columns]
        drop_cols  = [id_col] + label_cols
        written    = 0

        for _, row in df.iterrows():
            pid      = str(row[id_col])
            features = row.drop(labels=[c for c in drop_cols if c in row.index]).to_dict()
            # Replace NaN with None for clean JSON serialisation
            features = {k: (None if (v != v) else v) for k, v in features.items()}
            if self.write(pid, features):
                written += 1

        logger.info(f"Feature store: populated {written}/{len(df)} patients from {parquet_path.name}")
        return written

    def stats(self) -> dict:
        """Returns basic Redis stats — useful for monitoring endpoints."""
        if not self._available:
            return {"available": False, "reason": "Redis not connected"}
        try:
            info  = self._client.info()
            count = len(self._client.keys(self.FEATURE_PREFIX + "*"))
            return {
                "available":         True,
                "cached_patients":   count,
                "used_memory_human": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "uptime_seconds":    info.get("uptime_in_seconds"),
                "ttl_seconds":       self.ttl,
            }
        except Exception as e:
            return {"available": False, "error": str(e)}

    def health(self) -> bool:
        if not self._available:
            return False
        try:
            return self._client.ping()
        except Exception:
            return False


# ── Module-level singleton ────────────────────────────────────────────────────
# Imported by serving/app.py and streaming/consumer.py.
# Constructed lazily so import never blocks on Redis connection.

import sys
from pathlib import Path as _Path
sys.path.insert(0, str(_Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(_Path(__file__).resolve().parents[1]))

def _build_default_store() -> FeatureStore:
    try:
        from config.settings import (
            REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB, REDIS_FEATURE_TTL,
        )
        return FeatureStore(
            host=REDIS_HOST, port=REDIS_PORT,
            password=REDIS_PASSWORD, db=REDIS_DB,
            ttl=REDIS_FEATURE_TTL,
        )
    except Exception:
        return FeatureStore()


_default_store: Optional[FeatureStore] = None


def get_store() -> FeatureStore:
    """Return the module-level singleton FeatureStore, creating it on first call."""
    global _default_store
    if _default_store is None:
        _default_store = _build_default_store()
    return _default_store
