/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.DEPLOYED_URL || 'https://ve-collab.org/',
    generateRobotsTxt: true,
    sitemapSize: 7000, // split large sitemap into multiple files
};
