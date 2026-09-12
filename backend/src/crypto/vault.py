"""
Secure Document Vault — orchestrates Modules A, B, C.

Ingestion flow:
  1. hash  = SHA256(plaintext)                    [Module B]
  2. blob  = AES-256-GCM(plaintext, key, AAD=doc_id)  [Module A]
  3. block = ledger.append(doc_id, hash, user)    [Module C]

Retrieval flow:
  1. block  = ledger.get_by_doc_id(doc_id)        [Module C]
  2. blob   = read from encrypted store           [Module A]
  3. plain  = AES-256-GCM-decrypt(blob, key, AAD=doc_id)  [Module A]
  4. ok     = verify_hash(plain, block.sha256_hash)       [Module B]
"""

from crypto_engine import encrypt_document, decrypt_document
from integrity import generate_hash, verify_hash
from ledger import AuditLedger


class SecureDocumentVault:
    def __init__(self, secret_key: bytes, db_path: str = "vault.db"):
        self.key = secret_key
        self.ledger = AuditLedger(db_path)
        self._store: dict[str, bytes] = {}   # in-memory blob store for the demo

    # -----------------------------------------------------------------
    # Ingestion
    # -----------------------------------------------------------------

    def ingest(self, doc_id: str, file_bytes: bytes, uploaded_by: str) -> dict:
        # 1. Integrity fingerprint on the ORIGINAL bytes
        sha256 = generate_hash(file_bytes)

        # 2. Encrypt (AAD binds ciphertext to doc_id)
        blob = encrypt_document(file_bytes, self.key, document_id=doc_id)
        self._store[doc_id] = blob

        # 3. Append to ledger
        block = self.ledger.append(doc_id, sha256, uploaded_by)
        return block

    # -----------------------------------------------------------------
    # Retrieval
    # -----------------------------------------------------------------

    def retrieve(self, doc_id: str) -> tuple[bytes, bool, str]:
        """
        Returns (plaintext, hash_matches, message).
        `hash_matches` is False if the ledger hash disagrees with the
        decrypted bytes — i.e., the record was tampered with somewhere.
        """
        block = self.ledger.get_by_doc_id(doc_id)
        if not block:
            raise KeyError(f"No ledger entry for doc_id={doc_id}")

        blob = self._store.get(doc_id)
        if not blob:
            raise KeyError(f"No encrypted blob for doc_id={doc_id}")

        plaintext = decrypt_document(blob, self.key, document_id=doc_id)
        ok = verify_hash(plaintext, block["sha256_hash"])

        msg = "OK — hash matches ledger" if ok else "TAMPER — hash mismatch vs ledger"
        return plaintext, ok, msg
