import hashlib
import json
from datetime import datetime, timezone


class AuditLedger:

    def __init__(self):
        self.entries = []

    def _hash(self, data):

        encoded = json.dumps(
            data,
            sort_keys=True,
            separators=(",", ":")
        ).encode()

        return hashlib.sha256(encoded).hexdigest()

    def record(self, user, action, decision, reason):

        previous_hash = (
            self.entries[-1]["hash"]
            if self.entries
            else "GENESIS"
        )

        entry = {
            "index": len(self.entries),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": user.get("name", "UNKNOWN"),
            "role": user.get("role", "UNKNOWN"),
            "action": action,
            "decision": decision,
            "reason": reason,
            "previous_hash": previous_hash,
        }

        entry["hash"] = self._hash(entry)

        self.entries.append(entry)

    def verify_chain(self):

        previous_hash = "GENESIS"

        for entry in self.entries:

            if entry["previous_hash"] != previous_hash:
                return False

            data = entry.copy()
            stored_hash = data.pop("hash")

            if self._hash(data) != stored_hash:
                return False

            previous_hash = stored_hash

        return True

    def display(self):

        print("\n========== AUDIT LEDGER ==========")

        for entry in self.entries:

            print(f"\nEntry #{entry['index']}")
            print("User:", entry["user"])
            print("Action:", entry["action"])
            print("Decision:", entry["decision"])
            print("Reason:", entry["reason"])
            print("Hash:", entry["hash"])
