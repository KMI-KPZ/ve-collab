require('dotenv').config();

if (!process.env.WORDPRESS_GRAPHQL_API_URL) {
    throw new Error(`
      Please provide a valid URL to your Wordpress GraphQL endpoint in .env.local .
    `);
}
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

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8888',
                pathname: '/uploads/**',
            },
        ],
    },
    transpilePackages: ['@jitsi/react-sdk'], // workaround for https://github.com/jitsi/jitsi-meet-react-sdk/issues/12
};

module.exports = nextConfig;
