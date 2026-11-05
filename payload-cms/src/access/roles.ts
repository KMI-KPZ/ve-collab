import type { Access } from 'payload';

const isKeycloakUser = (user: any): boolean => user?._strategy === 'keycloak';

/**
 * True if the user logged in via Keycloak and has 'admin' role.
 */
export const isAdmin: Access = ({ req }) => {
    const user = req.user as any;
    if (!user) return false;
    // Only Keycloak users rely on the transient _role field.
    // Local Payload auth (including built-in local-jwt) remains full admin.
    if (!isKeycloakUser(user)) return true;
    return user._role === 'admin';
};

/**
 * True if the user is at least an editor (editor OR admin).
 */
export const isEditorOrAdmin: Access = ({ req }) => {
    const user = req.user as any;
    if (!user) return false;
    if (!isKeycloakUser(user)) return true;
    return user._role === 'admin' || user._role === 'editor';
};

/**
 * True if the user authenticated via Payload's built-in strategy (not Keycloak).
 */
export const isLocalStrategy: Access = ({ req }) => {
    const user = req.user as any;
    if (!user) return false;
    return !isKeycloakUser(user);
};
