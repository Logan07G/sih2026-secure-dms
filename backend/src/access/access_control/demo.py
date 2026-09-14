from .middleware import authorize, audit_ledger


# Protected function
@authorize("view")
def view_document(user, resource):

    print(">>> Document viewed successfully.")

    return "SUCCESS"


@authorize("delete")
def delete_document(user, resource):

    print(">>> Document deleted successfully.")

    return "SUCCESS"


@authorize("download")
def download_document(user, resource):

    print(">>> Document downloaded successfully.")

    return "SUCCESS"


# Users
investigator = {
    "name": "Rahul",
    "role": "INVESTIGATOR",
    "department": "CYBER_CELL",
    "clearance_level": "HIGH"
}


officer = {
    "name": "Amit",
    "role": "OFFICER",
    "department": "CYBER_CELL",
    "clearance_level": "MEDIUM"
}


# Documents
cyber_document = {
    "case_id": "CASE-001",
    "department": "CYBER_CELL",
    "clearance_level": "HIGH"
}


financial_document = {
    "case_id": "CASE-002",
    "department": "FINANCIAL_CRIME",
    "clearance_level": "HIGH"
}


def main():

    print("======================================")
    print(" SECURE DOCUMENT ACCESS CONTROL")
    print("======================================")


    # ALLOW CASE
    print("\n[CASE 1] Investigator views document")

    print(
        view_document(
            investigator,
            cyber_document
        )
    )


    # RBAC DENY
    print("\n[CASE 2] Officer tries to delete")

    print(
        delete_document(
            officer,
            cyber_document
        )
    )


    # ABAC DENY
    print("\n[CASE 3] Investigator accesses another department")

    print(
        view_document(
            investigator,
            financial_document
        )
    )


    # ABAC clearance DENY
    print("\n[CASE 4] Medium clearance officer downloads HIGH document")

    print(
        download_document(
            officer,
            cyber_document
        )
    )


    # Show audit
    audit_ledger.display()


    # Verify chain
    print("\n========== CHAIN VERIFICATION ==========")

    if audit_ledger.verify_chain():

        print("✓ AUDIT CHAIN VERIFIED")
        print("✓ NO TAMPERING DETECTED")

    else:

        print("✗ AUDIT CHAIN COMPROMISED")
        print("✗ TAMPERING DETECTED")


if __name__ == "__main__":
    main()
