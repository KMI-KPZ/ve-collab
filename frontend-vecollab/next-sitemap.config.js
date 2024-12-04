/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.DEPLOYED_URL || 'https://ve-collab.org/',
    changefreq: 'daily',
    priority: 0.7,
    generateRobotsTxt: true,
    sitemapSize: 7000, // split large sitemap into multiple files
    exclude: ['/admin', '/auth_test', '/learning-material/edit', '/orcidAccountLinkCallback'],
    alternateRefs: [
        {
            href: 'https://ve-collab.org/de',
            hreflang: 'de',
        },
        {
            href: 'https://ve-collab.org/en',
            hreflang: 'en',
        },
    ],
};
