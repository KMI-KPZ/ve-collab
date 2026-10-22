import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createLocalReq, headersWithCors, logoutOperation } from 'payload';
import type { PayloadHandler } from 'payload';
import { buildAuthorizationUrl, exchangeCodeForTokens, getUserInfo } from '../lib/keycloak';

/** Generate a random password that will never be used (Payload requires one for user creation). */
const randomPassword = () => crypto.randomBytes(32).toString('base64url');

/**
 * GET /api/keycloak/login
 *
 * Generates a CSRF state token, stores it in a short-lived cookie,
 * and redirects the browser to the Keycloak authorization endpoint.
 */
export const keycloakLoginHandler: PayloadHandler = async () => {
    const state = crypto.randomUUID();

    const headers = new Headers();
    headers.set('Set-Cookie', `kc_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`);
    headers.set('Location', buildAuthorizationUrl(state));

    return new Response(null, { status: 302, headers });
};

/**
 * GET /api/keycloak/callback
 *
 * Handles the OIDC redirect from Keycloak:
 *  1. Validates the state parameter against the state cookie (CSRF)
 *  2. Exchanges the authorization code for tokens
 *  3. Fetches user info from Keycloak
 *  4. Finds or creates a Payload user linked by keycloakId
 *  5. Signs a JWT and sets the kc-session cookie
 *  6. Redirects to the admin panel
 */
export const keycloakCallbackHandler: PayloadHandler = async (req) => {
    const url = new URL(req.url || '', `http://${req.headers.get('host') || 'localhost'}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    //CSRF check
    const cookies = req.headers.get('cookie') || '';
    const stateCookie = cookies
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('kc_state='));
    const savedState = stateCookie?.split('=')[1];

    if (!state || !savedState || state !== savedState) {
        return new Response('Invalid state parameter', { status: 403 });
    }

    if (!code) {
        // Keycloak may return an error instead of a code (e.g. user denied consent)
        const error = url.searchParams.get('error_description') || url.searchParams.get('error');
        return new Response(`Authentication failed: ${error || 'no code received'}`, {
            status: 400,
        });
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        const userInfo = await getUserInfo(tokens.access_token);

        if (!userInfo.sub) {
            return new Response('Keycloak did not return a subject identifier', { status: 502 });
        }

        // Extract realm roles from the Keycloak access token
        const accessPayload = JSON.parse(
            Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
        );
        const realmRoles: string[] = accessPayload?.realm_access?.roles ?? [];

        // Determine effective role (highest wins: admin > editor > guest)
        let effectiveRole = 'guest';
        if (realmRoles.includes('admin')) {
            effectiveRole = 'admin';
        } else if (realmRoles.includes('editor')) {
            effectiveRole = 'editor';
        }

        // Find existing user by keycloakId, or create a new one
        const { payload } = req;
        let user;

        const existing = await payload.find({
            collection: 'users',
            where: { keycloakId: { equals: userInfo.sub } },
            limit: 1,
        });

        if (existing.docs.length > 0) {
            user = existing.docs[0];
        } else {
            // create new user, since no one linked to this keycloakId yet
            // Derive an email: prefer Keycloak email, fall back to sub-based placeholder
            const email =
                userInfo.email || `${userInfo.preferred_username || userInfo.sub}@keycloak.local`;

            user = await payload.create({
                collection: 'users',
                data: {
                    email,
                    password: randomPassword(),
                    keycloakId: userInfo.sub,
                    name: userInfo.name || userInfo.preferred_username || userInfo.sub,
                },
            });
        }

        // Sign a Payload-compatible JWT (includes role from Keycloak)
        const secret = process.env.PAYLOAD_SECRET || '';
        const tokenExpiry = 7200; // 2 hours, matching Payload default
        const payloadToken = jwt.sign(
            {
                id: user.id,
                collection: 'users',
                email: user.email,
                role: effectiveRole,
            },
            secret,
            { expiresIn: tokenExpiry }
        );

        // Set cookies and redirect to admin
        const headers = new Headers();
        headers.append(
            'Set-Cookie',
            `kc-session=${payloadToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokenExpiry}`
        );
        // Clear the state cookie
        headers.append('Set-Cookie', 'kc_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        headers.set('Location', '/admin');

        return new Response(null, { status: 302, headers });
    } catch (err) {
        console.error('Keycloak callback error:', err);
        return new Response(`Authentication error: ${(err as Error).message}`, { status: 500 });
    }
};

/**
 * GET /api/keycloak/logout
 *
 * Logs the current Payload user out if present and always expires the custom
 * kc-session cookie in addition to Payload's own auth cookie.
 */
export const keycloakLogoutHandler: PayloadHandler = async (req) => {
    const authResult = await req.payload.auth({ headers: req.headers });
    const headers = headersWithCors({
        headers: new Headers(),
        req,
    });

    if (authResult.user) {
        const userCollection =
            req.payload.collections[
                authResult.user.collection as keyof typeof req.payload.collections
            ];
        const localReq = await createLocalReq({ user: authResult.user }, req.payload);
        await logoutOperation({
            allSessions: false,
            collection: userCollection,
            req: localReq,
        });
    }

    const payloadCookieName = `${req.payload.config.cookiePrefix}-token`;
    headers.append(
        'Set-Cookie',
        `${payloadCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    headers.append(
        'Set-Cookie',
        'kc-session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );

    const loginPath = req.payload.config.admin.routes.login || '/login';
    const adminBasePath = req.payload.config.routes.admin || '/admin';
    headers.set('Location', `${adminBasePath}${loginPath}`);

    return new Response(null, { status: 302, headers });
};
