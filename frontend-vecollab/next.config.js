if (!process.env.WORDPRESS_API_URL) {
    throw new Error(`
      Please provide a valid URL to your Wordpress GraphQL endpoint in .env.local .
    `)
}
if (!process.env.NEXT_PUBLIC_KEYCLOAK_ID) {
    throw new Error(`
      Please provide a valid NEXT_PUBLIC_KEYCLOAK_ID in .env.local .
    `)
}
if (!process.env.KEYCLOAK_SECRET) {
    throw new Error(`
      Please provide a valid KEYCLOAK_SECRET in .env.local .
    `)
}
if (!process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER) {
  throw new Error(`
    Please provide a valid NEXT_PUBLIC_KEYCLOAK_ISSUER in .env.local .
  `)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: "standalone"
};

module.exports = nextConfig;
