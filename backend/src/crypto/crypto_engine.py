"""
Module A: Payload Encryptor & Decryptor (AES-256-GCM)

Design decisions:
- AES-256-GCM: authenticated encryption → confidentiality + integrity in one pass.
- 12-byte random nonce per encryption (NIST-recommended size for GCM).
- Payload format:  [ 12-byte nonce | ciphertext | 16-byte GCM tag ]
  (cryptography lib appends the tag to ciphertext automatically)
- AAD binds the ciphertext to a document ID so blobs can't be swapped between records.
"""

import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, AESSIV
from cryptography.exceptions import InvalidTag

NONCE_SIZE = 12          # 96 bits — NIST SP 800-38D recommended
KEY_SIZE   = 32          # 256 bits → AES-256


# ---------------------------------------------------------------------------
# 1. Key handling
# ---------------------------------------------------------------------------

def generate_key() -> bytes:
    """Generate a fresh 256-bit secret key. Store it in an HSM/KMS in production."""
    return AESGCM.generate_key(bit_length=256)


def derive_key_from_password(password: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    """
    Demo-friendly key derivation. NOT for production — use Argon2id or PBKDF2
    with high iteration counts there. Here we use SHA-256(salt||password) so
    the prototype is self-contained with no extra deps.
    """
    if salt is None:
        salt = os.urandom(16)
    key = hashlib.sha256(salt + password.encode()).digest()
    return key, salt


# ---------------------------------------------------------------------------
# 2. Encrypt / Decrypt
# ---------------------------------------------------------------------------

def encrypt_document(file_bytes: bytes, secret_key: bytes, document_id: str = "") -> bytes:
    """
    Encrypt file bytes with AES-256-GCM.

    Returns a single blob:  nonce (12B) || ciphertext || tag (16B)

    The `document_id` is used as AAD (Additional Authenticated Data). It is
    NOT encrypted, but the ciphertext becomes cryptographically bound to it.
    Tampering with the ID → decryption fails.
    """
    if len(secret_key) != KEY_SIZE:
        raise ValueError(f"secret_key must be {KEY_SIZE} bytes (got {len(secret_key)})")

    aesgcm = AESGCM(secret_key)
    nonce = os.urandom(NONCE_SIZE)
    aad = document_id.encode() if document_id else None

    ciphertext_with_tag = aesgcm.encrypt(nonce, file_bytes, aad)
    return nonce + ciphertext_with_tag


def decrypt_document(encrypted_bytes: bytes, secret_key: bytes, document_id: str = "") -> bytes:
    """
    Decrypt a blob produced by `encrypt_document`.

    Raises InvalidTag if:
      - the ciphertext was modified,
      - the tag was modified,
      - the wrong key is used,
      - the AAD (document_id) does not match.
    """
    if len(secret_key) != KEY_SIZE:
        raise ValueError(f"secret_key must be {KEY_SIZE} bytes (got {len(secret_key)})")

    if len(encrypted_bytes) < NONCE_SIZE + 16:
        raise ValueError("Encrypted payload is too short to be valid.")

    nonce = encrypted_bytes[:NONCE_SIZE]
    ciphertext_with_tag = encrypted_bytes[NONCE_SIZE:]
    aad = document_id.encode() if document_id else None

    aesgcm = AESGCM(secret_key)
    return aesgcm.decrypt(nonce, ciphertext_with_tag, aad)


# ---------------------------------------------------------------------------
# 3. Convenience: file I/O wrapper (handy for the demo)
# ---------------------------------------------------------------------------

def encrypt_file(in_path: str, out_path: str, secret_key: bytes, document_id: str = "") -> None:
    with open(in_path, "rb") as f:
        data = f.read()
    blob = encrypt_document(data, secret_key, document_id)
    with open(out_path, "wb") as f:
        f.write(blob)


def decrypt_file(in_path: str, out_path: str, secret_key: bytes, document_id: str = "") -> None:
    with open(in_path, "rb") as f:
        blob = f.read()
    data = decrypt_document(blob, secret_key, document_id)
    with open(out_path, "wb") as f:
        f.write(data)

