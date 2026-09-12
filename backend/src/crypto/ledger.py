"""
Module C: Mock Append-Only Audit Ledger

Design: a mini hash chain (like a 1-block-per-document blockchain).
Every block stores the SHA-256 of the PREVIOUS block, so modifying any
historical block invalidates every block after it.

Storage: SQLite. The application NEVER issues UPDATE or DELETE — only
INSERT. In production you'd use WORM storage or a real distributed ledger.
"""

import sqlite3
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

GENESIS_PREV_HASH = "0" * 64


# ---------------------------------------------------------------------------
# Canonical serialization — critical for deterministic hashing
# ---------------------------------------------------------------------------

def _canonical_json(block: dict) -> bytes:
    """
    Canonical form: sorted keys, no whitespace, UTF-8.
    Two dicts with the same fields always produce the same bytes → same hash.
    """
    return json.dumps(block, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _compute_block_hash(block: dict) -> str:
    """
    Block hash = SHA256( canonical_json(block without 'block_hash' field) ).
    The 'block_hash' field itself is excluded so we don't have a circular dependency.
    """
    fields = {k: v for k, v in block.items() if k not in ("block_hash", "seq")}
    return hashlib.sha256(_canonical_json(fields)).hexdigest()


# ---------------------------------------------------------------------------
# Ledger class
# ---------------------------------------------------------------------------

class AuditLedger:
    def __init__(self, db_path: str = "vault.db"):
        self.db_path = db_path
        self._init_schema()

    def _init_schema(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ledger (
                    seq                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id              TEXT    NOT NULL,
                    timestamp           TEXT    NOT NULL,
                    sha256_hash         TEXT    NOT NULL,
                    uploaded_by         TEXT    NOT NULL,
                    previous_block_hash TEXT    NOT NULL,
                    block_hash          TEXT    NOT NULL
                )
            """)
            # TRIGGERS: hard-block UPDATE and DELETE at the DB level.
            # Even if application code tries to tamper, SQLite refuses.
            conn.execute("""
                CREATE TRIGGER IF NOT EXISTS ledger_no_update
                BEFORE UPDATE ON ledger
                BEGIN
                    SELECT RAISE(ABORT, 'Ledger is append-only: UPDATE forbidden');
                END
            """)
            conn.execute("""
                CREATE TRIGGER IF NOT EXISTS ledger_no_delete
                BEFORE DELETE ON ledger
                BEGIN
                    SELECT RAISE(ABORT, 'Ledger is append-only: DELETE forbidden');
                END
            """)

    # -----------------------------------------------------------------
    # Append
    # -----------------------------------------------------------------

    def append(self, doc_id: str, sha256_hash: str, uploaded_by: str) -> dict:
        """Append a new block and return it (including its block_hash)."""
        prev_hash = self._last_block_hash()

        block = {
            "doc_id":              doc_id,
            "timestamp":           datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sha256_hash":         sha256_hash,
            "uploaded_by":         uploaded_by,
            "previous_block_hash": prev_hash,
        }
        block["block_hash"] = _compute_block_hash(block)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO ledger
                   (doc_id, timestamp, sha256_hash, uploaded_by,
                    previous_block_hash, block_hash)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (block["doc_id"], block["timestamp"], block["sha256_hash"],
                 block["uploaded_by"], block["previous_block_hash"],
                 block["block_hash"]),
            )
        return block

    # -----------------------------------------------------------------
    # Lookups
    # -----------------------------------------------------------------

    def _last_block_hash(self) -> str:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT block_hash FROM ledger ORDER BY seq DESC LIMIT 1"
            ).fetchone()
        return row[0] if row else GENESIS_PREV_HASH

    def get_by_doc_id(self, doc_id: str) -> Optional[dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM ledger WHERE doc_id = ? ORDER BY seq DESC LIMIT 1",
                (doc_id,),
            ).fetchone()
        return dict(row) if row else None

    def all_blocks(self) -> list[dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM ledger ORDER BY seq ASC").fetchall()
        return [dict(r) for r in rows]

    # -----------------------------------------------------------------
    # Chain verification
    # -----------------------------------------------------------------

    def verify_chain(self) -> tuple[bool, str]:
        """
        Walk the whole chain and confirm:
          1. Each block's stored hash matches a recomputation of its fields.
          2. Each block's previous_block_hash matches the prior block's block_hash.
        Returns (is_valid, message).
        """
        prev = GENESIS_PREV_HASH
        for block in self.all_blocks():
            if block["previous_block_hash"] != prev:
                return False, (
                    f"Chain break at seq={block['seq']}: "
                    f"expected prev={prev[:12]}..., got {block['previous_block_hash'][:12]}..."
                )
            recomputed = _compute_block_hash(block)
            if recomputed != block["block_hash"]:
                return False, (
                    f"Block hash mismatch at seq={block['seq']} (doc_id={block['doc_id']}): "
                    f"stored={block['block_hash'][:12]}..., "
                    f"recomputed={recomputed[:12]}..."
                )
            prev = block["block_hash"]
        return True, f"Chain intact ({len(self.all_blocks())} block(s))."
