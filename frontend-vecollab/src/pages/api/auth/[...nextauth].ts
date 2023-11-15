import NextAuth, { Account, Session, User } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import KeycloakProvider, { KeycloakProfile } from 'next-auth/providers/keycloak';
import { type OAuthConfig } from 'next-auth/providers';
import { AdapterUser } from 'next-auth/adapters';

if (!process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID) {
    throw new Error(`
        Please provide a valid NEXT_PUBLIC_KEYCLOAK_CLIENT_ID in .env.local .
    `);
}
if (!process.env.KEYCLOAK_CLIENT_SECRET) {
    throw new Error(`
        Please provide a valid KEYCLOAK_CLIENT_SECRET in .env.local .
    `);
}
if (!process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL) {
    throw new Error(`
        Please provide a valid NEXT_PUBLIC_KEYCLOAK_BASE_URL in .env.local .
    `);
}
if (!process.env.NEXT_PUBLIC_KEYCLOAK_REALM) {
    throw new Error(`
        Please provide a valid NEXT_PUBLIC_KEYCLOAK_REALM in .env.local .
    `);
}

interface JWTProps {
    token: JWT;
    user?: User | AdapterUser | undefined;
    account?: Account | null | undefined;
}

interface SessionProps {
    token: JWT;
    session: Session;
}

declare module 'next-auth' {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `Provider` React Context
     */

    /**
     * Usually contains information about the provider being used
     * and also extends `TokenSet`, which is different tokens returned by OAuth Providers.
     */
    interface Account {
        provider: string;
        id: string;
        accessToken: string;
        accessTokenExpires?: any;
        refreshToken: string;
        idToken: string;
        access_token: string;
        expires_in: number;
        refresh_expires_in: number;
        refresh_token: string;
        token_type: string;
        id_token: string;
        'not-before-policy': number;
        session_state: string;
        scope: string;
    }

    interface User {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        given_name?: string | null;
        family_name?: string | null;
        iss?: string | null;
        email_verified?: boolean | null;
        role?: string | null;
        groups?: string[] | null;
        preferred_username?: string | null;
        orcid?: string | null | undefined;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            given_name?: string | null;
            family_name?: string | null;
            iss?: string | null;
            email_verified?: boolean | null;
            role?: string | null;
            groups?: string[] | null;
            preferred_username?: string | null;
            orcid?: string | null | undefined;
        };
        error: string;
        accessToken: string;
        idToken: string;
        sessionState: string;
    }
}

declare module 'next-auth/jwt' {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        name: string;
        email: string;
        sub: string;
        accessToken: string;
        refreshToken: string;
        accessTokenExpired: number;
        refreshTokenExpired: number;
        user: User;
        error: string;
        idToken: string;
        sessionState: string;
    }
}

const refreshAccessToken = async (token: JWT): Promise<JWT> => {
    try {
        if (!token.refreshTokenExpired) throw Error;
        if (Date.now() > token.refreshTokenExpired) throw Error;
        const details = {
            client_id: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
            grant_type: ['refresh_token'],
            refresh_token: token.refreshToken,
        };
        const formBody: string[] = [];
        Object.entries(details).forEach(([key, value]: [string, any]) => {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(value);
            formBody.push(encodedKey + '=' + encodedValue);
        });
        const formData = formBody.join('&');
        const url = `${process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL}realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/token`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: formData,
        });
        const refreshedTokens = await response.json();
        if (!response.ok) throw refreshedTokens;

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpired: Date.now() + (refreshedTokens.expires_in - 15) * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
            refreshTokenExpired: Date.now() + (refreshedTokens.refresh_expires_in - 15) * 1000,
            idToken: refreshedTokens.id_token,
        };
    } catch (error) {
        console.log(error);
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        };
    }
};

export const authOptions = {
    session: {
        maxAge: 60 * 60,
    },
    providers: [
        KeycloakProvider({
            id: 'keycloak',
            clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
            issuer: `${process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL}realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}`,
            profile(profile: KeycloakProfile) {
                return {
                    iss: profile.iss,
                    email_verified: profile.email_verified,
                    role: profile.role,
                    name: profile.name,
                    groups: profile.groups,
                    preferred_username: profile.preferred_username,
                    given_name: profile.given_name,
                    family_name: profile.family_name,
                    email: profile.email,
                    id: profile.sub,
                    orcid: profile.orcid,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }: JWTProps): Promise<JWT> {
            if (account && user) {
                // Add access_token, refresh_token and expirations to the token right after signin
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.sessionState = account.session_state;
                token.idToken = account.id_token;
                token.accessTokenExpired = account.expires_at!;
                token.refreshTokenExpired = Date.now() + (account.refresh_expires_in - 15) * 1000;
                token.user = user;

                return token;
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < token.accessTokenExpired) {
                console.log('token still valid');
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }: SessionProps): Promise<Session> {
            session.error = token.error;
            session.accessToken = token.accessToken;
            session.idToken = token.idToken;
            session.user = token.user;
            session.sessionState = token.sessionState;
            session.expires = new Date(token.accessTokenExpired).toISOString();
            return session;
        },
    },
    events: {
        // perform Single Logout on Keycloak IdP when user triggers a logout on our site, i.e. logout on every site that the user uses this account on
        async signOut({ token }: { token: JWT }) {
            const issuerUrl = (
                authOptions.providers.find(
                    (p) => p.id === 'keycloak'
                ) as OAuthConfig<KeycloakProfile>
            ).options!.issuer!;
            const logOutUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`);
            logOutUrl.searchParams.set('id_token_hint', token.idToken!);
            const res = await fetch(logOutUrl);
            if (res.status !== 200) {
                console.log('Single Logout to Keycloak failed');
            }
        },

        // TODO also call etherpad logout endpoint /ep_openid_connect/logout
    },
};
export default NextAuth(authOptions);
