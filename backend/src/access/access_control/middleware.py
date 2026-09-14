from functools import wraps

from .roles import check_permission
from .abac import check_abac
from .audit import AuditLedger


audit_ledger = AuditLedger()


def authorize(action):

    def decorator(function):

        @wraps(function)
        def wrapper(user, resource, *args, **kwargs):

            print("\n-----------------------------")
            print("Action:", action)
            print("User:", user.get("name"))

            
            if not check_permission(
                user.get("role"),
                action
            ):

                print("RBAC: DENIED")

                audit_ledger.record(
                    user,
                    action,
                    "DENY",
                    "RBAC permission denied"
                )

                return "ACCESS DENIED"

            print("RBAC: ALLOWED")

            
            if not check_abac(
                user,
                resource,
                action
            ):

                print("ABAC: DENIED")

                audit_ledger.record(
                    user,
                    action,
                    "DENY",
                    "ABAC policy failed"
                )

                return "ACCESS DENIED"

            print("ABAC: ALLOWED")

           
            audit_ledger.record(
                user,
                action,
                "ALLOW",
                "RBAC and ABAC passed"
            )

            print("AUDIT: Recorded")

            return function(
                user,
                resource,
                *args,
                **kwargs
            )

        return wrapper

    return decorator
