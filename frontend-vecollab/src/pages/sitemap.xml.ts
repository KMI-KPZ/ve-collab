import { ROUTES } from '@/data/routes';
import {
    fetchTaxonomy,
    getChildrenOfNode,
    getMaterialNodesOfNodeByText,
    getNodeById,
    getTopLevelNodes,
} from '@/lib/backend';
import { INode } from '@/interfaces/material/materialInterfaces';
import { NextApiResponse } from 'next';

async function getClusterLearningMaterial(taxonomy?: INode[]): Promise<string[]> {
    const clusters = await getTopLevelNodes(taxonomy);
    return clusters.map((cluster, index) => `/learning-material/${cluster.text}`);
}

async function getClusterSlugLearningMaterial(taxonomy?: INode[]): Promise<string[]> {
    const cluster = await getTopLevelNodes(taxonomy);
    const nodes: { [key: string]: INode[] } = {};

    await Promise.all(
        cluster.map(async (bubble) => {
            nodes[bubble.text] = await getChildrenOfNode(bubble.id, taxonomy);
        })
    );

    const materials = await Promise.all(
        Object.values(nodes).flatMap(async (nodeArray) =>
            Promise.all(
                nodeArray.map(async (node: any) => {
                    const learning_page = await getMaterialNodesOfNodeByText(node.text, taxonomy);
                    return {
                        node_text: node.text,
                        learning_page: learning_page,
                        cluster_id: (await getNodeById(node.parent, taxonomy)).text,
                    };
                })
            )
        )
    ).then((results) => results.flat());

    return await Promise.all(
        materials.flatMap((material) => {
            const url = `/learning-material/${encodeURIComponent(
                material.cluster_id
            )}/${encodeURIComponent(material.node_text)}`;
            return material.learning_page.map((page) => `${url}/${encodeURIComponent(page.text)}`);
        })
    ).then((results) => results.filter((url) => url.length > 0));
}

function generateSiteMap(staticUrls: string[], dynamicRoutes: string[]) {
    const baseURL =
        process.env.NODE_ENV === 'production' ? 'https://ve-collab.org' : 'http://localhost:3000';
    const newDate = new Date().toISOString();

    const generateSitemapEntries = (routes: string[]) => {
        return routes
            .map((route) => {
                return `<url>
                        <loc>${baseURL}${route}</loc>
                        <lastmod>${newDate}</lastmod>
                        <priority>0.7</priority>
                        <changefreq>daily</changefreq>
                        <xhtml:link rel="alternate" hreflang="en" href="${baseURL}/en${route}" />
                        <xhtml:link rel="alternate" hreflang="de" href="${baseURL}/de${route}" />
                </url>`;
            })
            .join('');
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"  xmlns:xhtml="http://www.w3.org/1999/xhtml">
            ${generateSitemapEntries(staticUrls)}
            ${generateSitemapEntries(dynamicRoutes)}
        </urlset>`;
}

export async function getServerSideProps({ res }: { res: NextApiResponse }) {
    // We make an API call to gather the URLs for our site
    const staticRoutes = Object.values(ROUTES);

    // fetch learning material taxonomy once and built dynamic routes from it
    const taxonomy = await fetchTaxonomy();
    const dynamicRoutes1 = await getClusterSlugLearningMaterial(taxonomy);
    const dynamicRoutes2 = await getClusterLearningMaterial(taxonomy);
    const dynamicRoutes = [...dynamicRoutes1, ...dynamicRoutes2];

    // We generate the XML sitemap with the combined static and dynamic routes
    const sitemap = generateSiteMap(staticRoutes, dynamicRoutes);

    res.setHeader('Content-Type', 'application/xml');
    res.write(sitemap);
    res.end();

    return {
        props: {},
    };
}

// Dummy that next.js renders the page with xml content
export default function SiteMap() {}
