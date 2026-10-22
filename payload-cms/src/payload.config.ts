import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Methods } from './collections/Methods';
import {
    keycloakLoginHandler,
    keycloakCallbackHandler,
    keycloakLogoutHandler,
} from './endpoints/keycloak';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
    admin: {
        user: Users.slug,
        importMap: {
            baseDir: path.resolve(dirname),
        },
        components: {
            afterLogin: ['./components/KeycloakLoginButton'],
            views: {
                logout: {
                    Component: './components/KeycloakLogoutView',
                },
            },
        },
    },
    collections: [Users, Media, Methods],
    editor: lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET || '',
    typescript: {
        outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
    db: mongooseAdapter({
        url: process.env.DATABASE_URL || '',
    }),
    sharp,
    plugins: [],
    endpoints: [
        {
            path: '/keycloak/login',
            method: 'get',
            handler: keycloakLoginHandler,
        },
        {
            path: '/keycloak/callback',
            method: 'get',
            handler: keycloakCallbackHandler,
        },
        {
            path: '/keycloak/logout',
            method: 'get',
            handler: keycloakLogoutHandler,
        },
    ],
    cors: '*',
});
