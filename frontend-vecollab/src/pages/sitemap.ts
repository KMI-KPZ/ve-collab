import { MetadataRoute } from 'next';
import { ROUTES } from '@/data/routes';
import { getMaterialNodesOfNodeByText } from '@/lib/backend';
import { INode } from '@/interfaces/material/materialInterfaces';

// maybe add later
/*    PLAN_ID: `/plan/${planId}`,*/
/*    GROUP_ID: `/group/${groupId}`,*/
/*    PROFILE_USER_USERNAME: `/profile/user/${username}`,*/

/*export const ROUTES_DYNAMIC = {
    LEARNINGMATERIAL_CLUSTER: `/learning-material/${cluster}`,
    // LEARNINGMATERIAL_CLUSTER_NODE: `/learning-material/${cluster}/${node}`,
    LEARNINGMATERIAL_CLUSTER_NODE_SLUG: `/learning-material/${cluster}/${node}/${slug}`,
};*/

async function getClusterSlugLearningMaterial(): Promise<string[]> {
    const nodes: { [key: string]: INode[] } = {};

    const materials = await Promise.all(
        Object.values(nodes).flatMap(async (nodeArray) =>
            Promise.all(
                nodeArray.map(async (node) => {
                    const learning_page = await getMaterialNodesOfNodeByText(node.text);
                    return {
                        node_text: node.text,
                        learning_page: learning_page,
                        cluster_id: (node.parent % 10) + 1, // get last digit
                    };
                })
            )
        )
    ).then((results) => results.flat());

    return await Promise.all(
        materials.flatMap((material: any) => {
            const url = `/${encodeURIComponent(material.cluster_id)}/${encodeURIComponent(
                material.node_text
            )}`;
            return material.learning_page.map(
                (page: any) => `${url}/${encodeURIComponent(page.text)}`
            );
        })
    ).then((results) => results.filter((url) => url.length > 0));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const routes = Object.values(ROUTES);
    const baseURL =
        process.env.NODE_ENV === 'production' ? 'https://ve-collab.org/' : 'http://localhost:3000/';
    const newDate = new Date().toISOString();

    const dynamicRoutesLearningmaterials = await getClusterSlugLearningMaterial();

    const generateSitemapEntries = (routes: string[]) => {
        return routes.map((route) => ({
            url: `${baseURL}${route}`,
            lastModified: newDate,
            priority: 0.7,
            changefreq: 'daily',
            alternates: {
                languages: {
                    en: `${baseURL}/en${route}`,
                    de: `${baseURL}/de${route}`,
                },
            },
        }));
    };

    return [
        ...generateSitemapEntries(routes),
        ...generateSitemapEntries(dynamicRoutesLearningmaterials),
    ];
}
