/**
 * Keycloak OIDC helpers for the Authorization Code Flow.
 */

export interface KeycloakConfig {
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    endSessionEndpoint: string;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
}

export function getKeycloakConfig(): KeycloakConfig {
    const base = (process.env.KEYCLOAK_BASE_URL || '').replace(/\/$/, '');
    const realm = process.env.KEYCLOAK_REALM || '';
    const realmUrl = `${base}/realms/${realm}`;
    const oidc = `${realmUrl}/protocol/openid-connect`;

    const publicUrl = (process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:3030').replace(
        /\/$/,
        ''
    );

    return {
        issuer: realmUrl,
        authorizationEndpoint: `${oidc}/auth`,
        tokenEndpoint: `${oidc}/token`,
        userinfoEndpoint: `${oidc}/userinfo`,
        endSessionEndpoint: `${oidc}/logout`,
        clientId: process.env.KEYCLOAK_CLIENT_ID || '',
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
        callbackUrl: `${publicUrl}/api/keycloak/callback`,
    };
}

export interface KeycloakTokenResponse {
    access_token: string;
    id_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

export interface KeycloakUserInfo {
    sub: string;
    email?: string;
    email_verified?: boolean;
    preferred_username?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
}

/** Build the Keycloak authorization URL for the code flow redirect. */
export function buildAuthorizationUrl(state: string): string {
    const kc = getKeycloakConfig();
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: kc.clientId,
        redirect_uri: kc.callbackUrl,
        scope: 'openid email profile',
        state,
    });
    return `${kc.authorizationEndpoint}?${params.toString()}`;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<KeycloakTokenResponse> {
    const kc = getKeycloakConfig();
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kc.clientId,
        client_secret: kc.clientSecret,
        redirect_uri: kc.callbackUrl,
        code,
    });

    const res = await fetch(kc.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Token exchange failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<KeycloakTokenResponse>;
}

/** Fetch user info from Keycloak using the access token. */
export async function getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    const kc = getKeycloakConfig();
    const res = await fetch(kc.userinfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Userinfo request failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<KeycloakUserInfo>;
}
