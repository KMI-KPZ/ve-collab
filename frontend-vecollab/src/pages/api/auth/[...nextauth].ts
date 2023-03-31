import NextAuth, { Account, DefaultSession, Session, User } from "next-auth"
import { JWT } from "next-auth/jwt"
import KeycloakProvider, { KeycloakProfile } from "next-auth/providers/keycloak"
import { type OAuthConfig } from "next-auth/providers";

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

interface TokenInfo extends JWT {
    id_token?: string;
    accessToken?: string;
}

interface SessionInfo extends Session {
    accessToken?: string
}

interface JWTProps {
    token: TokenInfo,
    account?: Account | null | undefined,
}

interface SessionProps {
    session: SessionInfo,
    token: TokenInfo,
    user: User
}


declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        accessToken?: string
        & DefaultSession["user"]
    }
}

export const authOptions = {
    providers: [
        KeycloakProvider({
            clientId: process.env.KEYCLOAK_ID,
            clientSecret: process.env.KEYCLOAK_SECRET,
            issuer: process.env.KEYCLOAK_ISSUER,
        })
    ],
    callbacks: {
        async jwt({ token, account }: JWTProps): Promise<JWT> {
            // Persist the OAuth access_token to the token right after signin
            // becomes available in e.g. getToken()
            if (account) {
                token.accessToken = account.access_token
                token.id_token = account.id_token
            }
            return token
        },
        // only needed if we want to have the token available in useSession() client-side, right now token is accessed via getToken() on server side and given to component if needed client-side
        // it is more secure to not give tokens to clients, rather proxy backend api calls   
        async session({ session, token, user }: SessionProps): Promise<SessionInfo> {
            // Send properties to the client, like an access_token from a provider.
            session.accessToken = token.accessToken
            return session
        }
    },
    events: {
        // perform Single Logout on Keycloak IdP when user triggers a logout on our site, i.e. logout on every site that the user uses this account on
        async signOut({ token }: { token: TokenInfo }) {
            const issuerUrl = (authOptions.providers.find(p => p.id === "keycloak") as OAuthConfig<KeycloakProfile>).options!.issuer!
            const logOutUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`)
            logOutUrl.searchParams.set("id_token_hint", token.id_token!)
            const res = await fetch(logOutUrl);
            if (res.status !== 200) {
                console.log("Single Logout to Keycloak failed")
            }
        },
    }
}
export default NextAuth(authOptions)