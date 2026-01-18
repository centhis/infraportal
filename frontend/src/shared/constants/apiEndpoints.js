export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: "/auth/login/",
        PROFILE: "/auth/me",
        LOGOUT: "/auth/logout",
        REFRESH: "/auth/refresh",
        PERMISSIONS: "/auth/me/permissions"
    },
    USER_MANAGEMENT: {
        USERS: "/users",
        ROLES: "/roles",
        GROUPS: "/groups",
        PERMISSIONS: "/permissions",
    },
    SETTINGS: {
        CORE: "/settings/core",
        LDAP: "/settings/ldap",
        LDAP_TEST: "/settings/ldap/test",
        LDAP_IS_ENABLED: "/settings/ldap/is_enabled",
    }
}