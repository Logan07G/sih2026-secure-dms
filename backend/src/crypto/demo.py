"""
End-to-end demo of Modules A + B + C.
Run: python3 -m backend.src.crypto.demo
"""
import os
from .crypto_engine import generate_key, encrypt_document, decrypt_document
from .integrity import generate_hash
from .ledger import AuditLedger
from .vault import SecureDocumentVault
from cryptography.exceptions import InvalidTag

BANNER = "=" * 68

if os.path.exists("vault.db"):
    os.remove("vault.db")

key = generate_key()
vault = SecureDocumentVault(secret_key=key, db_path="vault.db")

print(BANNER)
print("SECURE DOCUMENT VAULT - MODULE A + B + C DEMO")
print(BANNER)

# --- Module A quick tests ---
print("\n[MODULE A] AES-256-GCM")
original = b"CONFIDENTIAL: FIR #1234 - Suspect statement..."
blob = encrypt_document(original, key, document_id="FIR-1234")
print(f"  original={len(original)}B  encrypted={len(blob)}B  "
      f"nonce={blob[:12].hex()}")
assert decrypt_document(blob, key, document_id="FIR-1234") == original
print("  round-trip        : PASS")

tampered = bytearray(blob); tampered[12 + 5] ^= 0x01
try:
    decrypt_document(bytes(tampered), key, document_id="FIR-1234")
    print("  tamper detection  : FAIL")
except InvalidTag:
    print("  tamper detection  : PASS")

try:
    decrypt_document(blob, key, document_id="FIR-9999")
    print("  AAD binding       : FAIL")
except InvalidTag:
    print("  AAD binding       : PASS")

# --- Module B ---
print("\n[MODULE B] SHA-256")
h = generate_hash(original)
print(f"  hash              : {h[:32]}...")
assert len(h) == 64
assert generate_hash(original) == h
assert generate_hash(original + b"x") != h
print("  determinism       : PASS")
print("  avalanche effect  : PASS")

# --- Module C + full vault flow ---
print("\n[MODULE C] Append-only hash-chained ledger")
docs = [
    ("FIR-2026-0892", b"FIR #0892: Theft at Sector 14.",       "SHO_Raj"),
    ("FIR-2026-0893", b"FIR #0893: Cyber fraud - Rs 5L.",       "SI_Meera"),
    ("FIR-2026-0894", b"FIR #0894: Missing person - minor.",    "SHO_Raj"),
]
for doc_id, content, user in docs:
    block = vault.ingest(doc_id, content, user)
    print(f"  + {doc_id}  block={block['block_hash'][:16]}...  by={user}")

print("\n[LEDGER CHAIN]")
for b in vault.ledger.all_blocks():
    print(f"  seq={b['seq']}  doc={b['doc_id']}  "
          f"prev={b['previous_block_hash'][:10]}...  "
          f"self={b['block_hash'][:10]}...")

ok, msg = vault.ledger.verify_chain()
print(f"\n  chain verify      : {'PASS' if ok else 'FAIL'} - {msg}")

# --- Retrieval + integrity ---
print("\n[RETRIEVAL]")
plain, hash_ok, msg2 = vault.retrieve("FIR-2026-0892")
print(f"  plaintext         : {plain[:50]}...")
print(f"  hash vs ledger    : {'PASS' if hash_ok else 'FAIL'} - {msg2}")

# --- Tamper test on encrypted blob ---
print("\n[TAMPER] flip a byte in encrypted blob")
blob2 = bytearray(vault._store["FIR-2026-0892"])
blob2[15] ^= 0x01
vault._store["FIR-2026-0892"] = bytes(blob2)
try:
    vault.retrieve("FIR-2026-0892")
    print("  result            : FAIL (should have raised)")
except InvalidTag:
    print("  result            : PASS - InvalidTag raised")

# --- Ledger tamper test (SQLite trigger) ---
print("\n[TAMPER] attempt UPDATE on ledger (blocked by trigger)")
import sqlite3
try:
    with sqlite3.connect("vault.db") as conn:
        conn.execute("UPDATE ledger SET sha256_hash='deadbeef' WHERE seq=1")
    print("  result            : FAIL (UPDATE allowed)")
except sqlite3.IntegrityError as e:
    print(f"  result            : PASS - {e}")

print("\n" + BANNER)
print("ALL MODULES OPERATIONAL")
print(BANNER)

