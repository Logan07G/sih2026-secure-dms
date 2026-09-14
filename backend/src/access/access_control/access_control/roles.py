# RBAC - Role Based Access Control

ROLE_PERMISSIONS = {
    "ADMIN": {
        "view",
        "search",
        "upload",
        "download",
        "delete",
        "audit",
    },

    "INVESTIGATOR": {
        "view",
        "search",
        "upload",
        "download",
    },

    "OFFICER": {
        "view",
        "search",
        "download",
    },

    "AUDITOR": {
        "view",
        "search",
        "audit",
    },
}


def check_permission(role, action):
    permissions = ROLE_PERMISSIONS.get(role, set())

    # Deny by default
    return action in permissions
