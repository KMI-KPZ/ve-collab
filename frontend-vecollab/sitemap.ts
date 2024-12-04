import { MetadataRoute } from 'next';

import { ROUTES } from './routes';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Fetch
    const res = await fetch('https://example.com/api/posts');
    const posts = await res.json();

    const routes = Object.values(ROUTES);
    const baseURL = 'https://ve-collab.org';
    const newDate = new Date().toISOString();

    const generateSitemapEntries = (routes: string[]) => {
        return routes.map((route) => ({
            url: `${baseURL}${route}`,
            lastModified: newDate,
            priority: 0.7,
            alternates: {
                languages: {
                    en: `${baseURL}/en${route}`,
                    de: `${baseURL}/de${route}`,
                },
            },
        }));
    };

    return [...generateSitemapEntries(routes)];
}
