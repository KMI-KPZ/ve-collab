import NextAuth, { Account, TokenSet, User } from "next-auth"
import { JWT } from "next-auth/jwt"
import KeycloakProvider, { KeycloakProfile } from "next-auth/providers/keycloak"
import { type OAuthConfig } from "next-auth/providers";
import { AdapterUser } from "next-auth/adapters";

if (!process.env.KEYCLOAK_ID) {
    throw new Error(`
      Please provide a valid KEYCLOAK_ID in .env.local .
    `)
}
if (!process.env.KEYCLOAK_SECRET) {
    throw new Error(`
      Please provide a valid KEYCLOAK_SECRET in .env.local .
    `)
}

interface JWTProps {
    token: JWT,
    user?: User | AdapterUser | undefined
    account?: Account | null | undefined
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
    }
}

const refreshAccessToken = async (token: JWT): Promise<JWT> => {
    console.log("in refresh")
    try {
        if (!token.refreshTokenExpired) throw Error;
        if (Date.now() > token.refreshTokenExpired) throw Error;
        const details = {
            client_id: process.env.KEYCLOAK_ID,
            client_secret: process.env.KEYCLOAK_SECRET,
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
        const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: formData,
        });
        const refreshedTokens = await response.json();
        if (!response.ok) throw refreshedTokens;
        console.log("refreshed token!")
        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpired: Date.now() + (refreshedTokens.expires_in - 15) * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
            refreshTokenExpired:
                Date.now() + (refreshedTokens.refresh_expires_in - 15) * 1000,
            idToken: refreshedTokens.id_token
        };
    } catch (error) {
        console.log(error)
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        };
    }
};

export const authOptions = {
    providers: [
        KeycloakProvider({
            clientId: process.env.KEYCLOAK_ID,
            clientSecret: process.env.KEYCLOAK_SECRET,
            issuer: process.env.KEYCLOAK_ISSUER,
        })
    ],
    callbacks: {
        async jwt({ token, user, account }: JWTProps): Promise<JWT> {


            if (account && user) {
                // Add access_token, refresh_token and expirations to the token right after signin
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.idToken = account.id_token;
                if (account.expires_at) {
                    token.accessTokenExpired = account.expires_at;
                }
                token.refreshTokenExpired =
                    Date.now() + (account.refresh_expires_in - 15) * 1000;
                token.user = user;

                return token;
            }


            // Return previous token if the access token has not expired yet
            if (Date.now() < token.accessTokenExpired){
                console.log("token still valid")
                return token;
            } 
                

            // Access token has expired, try to update it
            return refreshAccessToken(token);




            // Persist the OAuth access_token to the token right after signin
            // becomes available in e.g. getToken()
            //if (account) {
            //   token.accessToken = account.access_token
            //  token.id_token = account.id_token
            //}
            //return token
        },
        // only needed if we want to have the token available in useSession() client-side, right now token is accessed via getToken() on server side and given to component if needed client-side
        // it is more secure to not give tokens to clients, rather proxy backend api calls   
        // async session({ session, token, user }) {
        //     // Send properties to the client, like an access_token from a provider.
        //     session.accessToken = token.accessToken
        //     return session
        // }
    },
    events: {
        // perform Single Logout on Keycloak IdP when user triggers a logout on our site, i.e. logout on every site that the user uses this account on
        async signOut({ token }: { token: JWT }) {
            const issuerUrl = (authOptions.providers.find(p => p.id === "keycloak") as OAuthConfig<KeycloakProfile>).options!.issuer!
            const logOutUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`)
            logOutUrl.searchParams.set("id_token_hint", token.idToken!)
            const res = await fetch(logOutUrl);
            if (res.status !== 200) {
                console.log("Single Logout to Keycloak failed")
            }
        },
    }
}
export default NextAuth(authOptions)