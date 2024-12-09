import { MetadataRoute } from 'next';
import { ROUTES } from './routes';

export const ROUTES_DYNAMIC = {
    LEARNINGMATERIAL_CLUSTER: `/learning-material/${cluster}`,
    // LEARNINGMATERIAL_CLUSTER_NODE: `/learning-material/${cluster}/${node}`,
    LEARNINGMATERIAL_CLUSTER_NODE_SLUG: `/learning-material/${cluster}/${node}/${slug}`,

    // maybe add later
    /*    PLAN_ID: `/plan/${planId}`,*/
    /*    GROUP_ID: `/group/${groupId}`,*/
    /*    PROFILE_USER_USERNAME: `/profile/user/${username}`,*/
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Fetch
    /*    const res = await fetch('https://example.com/api/posts');
    const posts = await res.json();*/

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

// top bubbles=[cluster]
// const cluster = await getTopLevelNodes();

// kleineren bubbles = [nodes]
/*const nodes: { [key: string]: INode[] } = {};

await Promise.all(
    cluster.map(async (bubble) => {
        const nodesInBubble = await getChildrenOfNode(bubble.id);
        nodes[bubble.text] = nodesInBubble;
    })
);*/

// lections = [slug]
/*const lectionsOfNode = await getMaterialNodesOfNodeByText(currentNode.text);*/
