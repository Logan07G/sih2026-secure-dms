from .crypto_engine import (
    generate_key, encrypt_document, decrypt_document,
    encrypt_file, decrypt_file, NONCE_SIZE,
)
from cryptography.exceptions import InvalidTag

# ---------- 1. Round-trip on raw bytes ----------
key = generate_key()
original = b"CONFIDENTIAL: FIR #1234 - Suspect statement..."

blob = encrypt_document(original, key, document_id="FIR-1234")
print(f"[+] Original size : {len(original)} bytes")
print(f"[+] Encrypted size: {len(blob)} bytes  (nonce 12B + ct + tag 16B)")
print(f"[+] Nonce (hex)   : {blob[:NONCE_SIZE].hex()}")

recovered = decrypt_document(blob, key, document_id="FIR-1234")
assert recovered == original
print("[+] Round-trip OK\n")

# ---------- 2. Tamper test — flip one bit in the ciphertext ----------
tampered = bytearray(blob)
tampered[NONCE_SIZE + 5] ^= 0x01    # flip a bit
try:
    decrypt_document(bytes(tampered), key, document_id="FIR-1234")
    print("[!] FAIL — tamper was not detected")
except InvalidTag:
    print("[+] Tamper detected — GCM auth tag rejected the payload\n")

# ---------- 3. Wrong AAD test ----------
try:
    decrypt_document(blob, key, document_id="FIR-9999")
    print("[!] FAIL — wrong document_id accepted")
except InvalidTag:
    print("[+] Wrong document_id rejected — AAD binding works\n")

# ---------- 4. Wrong key test ----------
try:
    decrypt_document(blob, generate_key(), document_id="FIR-1234")
    print("[!] FAIL — wrong key accepted")
except InvalidTag:
    print("[+] Wrong key rejected\n")

# ---------- 5. File round-trip (PDF demo) ----------
encrypt_file("sample.pdf", "sample.pdf.enc", key, document_id="FIR-1234")
decrypt_file("sample.pdf.enc", "sample_decrypted.pdf", key, document_id="FIR-1234")
print("[+] File encrypted → decrypted successfully")
