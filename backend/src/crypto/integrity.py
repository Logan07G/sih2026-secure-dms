"""
Module B: Integrity Checksum Engine (SHA-256)

Why SHA-256?
- 256-bit output → 2^128 collision resistance (birthday bound).
- Deterministic: same bytes → same hash, every time.
- Avalanche effect: 1-bit change → ~50% of output bits flip.
- FIPS 180-4 standardized, widely audited.
"""

import hashlib
import hmac


def generate_hash(file_bytes: bytes) -> str:
    """
    Return the SHA-256 hex digest of the given bytes.
    Output is always 64 lowercase hex chars.
    """
    return hashlib.sha256(file_bytes).hexdigest()


def verify_hash(file_bytes: bytes, stored_hash: str) -> bool:
    """
    Constant-time comparison of the file's current hash against the stored hash.
    Returns True if match, False otherwise.

    Uses hmac.compare_digest to avoid timing side-channels
    (plain '==' short-circuits on first differing byte).
    """
    current = generate_hash(file_bytes)
    return hmac.compare_digest(current, stored_hash.lower())

