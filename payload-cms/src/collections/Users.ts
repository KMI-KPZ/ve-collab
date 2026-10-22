import { isAdmin } from '@/access/roles';
import jwt from 'jsonwebtoken';
import type { Access, CollectionConfig } from 'payload';

const getCookieValue = (cookieHeader: string, name: string): string | null => {
    const match = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${name}=`));

    if (!match) return null;
    return match.split('=').slice(1).join('=') || null;
};

const readOwnOrAdmin: Access = ({ req }) => {
    const user = req.user as any;
    if (!user) return false;
    // Local Payload users, including built-in local-jwt, can read everything.
    if (user._strategy !== 'keycloak') return true;
    // admin roles can read everything
    if (user._role === 'admin') return true;
    // Keycloak users can read their own document
    return { id: { equals: user.id } };
};

export const Users: CollectionConfig = {
    slug: 'users',
    admin: {
        useAsTitle: 'email',
        hidden: ({ user }) => {
            const currentUser = user as any;
            if (!currentUser) return true;
            if (currentUser._strategy !== 'keycloak') return false;
            return currentUser._role !== 'admin';
        },
    },
    auth: {
        strategies: [
            {
                name: 'keycloak-jwt',
                authenticate: async ({ payload, headers }) => {
                    const cookieHeader = headers.get('cookie') || '';
                    const keycloakToken = getCookieValue(cookieHeader, 'kc-session');
                    if (!keycloakToken) {
                        return { user: null };
                    }

                    const verifyAndResolveUser = async (token: string) => {
                        const secret = process.env.PAYLOAD_SECRET || '';
                        const decoded = jwt.verify(token, secret) as {
                            id: string;
                            collection: string;
                            email: string;
                            role?: string;
                        };

                        if (decoded.collection !== 'users' || !decoded.id) {
                            return null;
                        }

                        const user = await payload.findByID({
                            collection: 'users',
                            id: decoded.id,
                        });

                        if (!user) return null;

                        return { user, decoded };
                    };

                    try {
                        const resolved = await verifyAndResolveUser(keycloakToken);

                        if (!resolved) {
                            return { user: null };
                        }

                        return {
                            user: {
                                ...resolved.user,
                                collection: 'users',
                                _strategy: 'keycloak',
                                _role: resolved.decoded.role || 'guest',
                            },
                        };
                    } catch {
                        // Invalid or expired token
                        return { user: null };
                    }
                },
            },
        ],
    },
    access: {
        read: readOwnOrAdmin,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin,
        admin: ({ req }) => {
            const user = req.user as any;
            if (!user) return false;
            // Local Payload users, including built-in local-jwt, always have admin panel access.
            if (user._strategy !== 'keycloak') return true;
            // Keycloak users need at least editor role
            return user._role === 'admin' || user._role === 'editor';
        },
    },
    fields: [
        {
            name: 'name',
            type: 'text',
        },
        {
            name: 'keycloakId',
            type: 'text',
            unique: true,
            index: true,
            admin: {
                description: 'Keycloak subject ID (set automatically on SSO login)',
                readOnly: true,
            },
        },
    ],
};
