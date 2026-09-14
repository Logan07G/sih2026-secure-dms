

CLEARANCE_LEVELS = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
}


ABAC_POLICIES = {

    "view": [
        {
            "attribute": "department",
            "operator": "equals_resource"
        },
        {
            "attribute": "clearance_level",
            "operator": "greater_or_equal_resource"
        }
    ],

    "search": [
        {
            "attribute": "department",
            "operator": "equals_resource"
        }
    ],

    "download": [
        {
            "attribute": "department",
            "operator": "equals_resource"
        },
        {
            "attribute": "clearance_level",
            "operator": "greater_or_equal_resource"
        }
    ],

    "upload": [
        {
            "attribute": "department",
            "operator": "equals_resource"
        }
    ],
}


def check_abac(user, resource, action):

    policies = ABAC_POLICIES.get(action)

    # No policy = deny
    if not policies:
        return False

    for condition in policies:

        attribute = condition["attribute"]
        operator = condition["operator"]

        user_value = user.get(attribute)
        resource_value = resource.get(attribute)

        
        if user_value is None or resource_value is None:
            return False

        if operator == "equals_resource":
            if user_value != resource_value:
                return False

        elif operator == "greater_or_equal_resource":

            user_level = CLEARANCE_LEVELS.get(user_value, 0)
            resource_level = CLEARANCE_LEVELS.get(resource_value, 999)

            if user_level < resource_level:
                return False

    return True
