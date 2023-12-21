import { Categories, Post, PostPreview } from '@/interfaces';

let API_URL_STR = process.env.WORDPRESS_GRAPHQL_API_URL;
// fallback to localhost if WORDPRESS_GRAPHQL_API_URL is not defined in env
if (API_URL_STR === undefined) {
    API_URL_STR = 'http://localhost';
}
const API_URL = new URL(API_URL_STR);

async function fetchAPI(query: string = '', { variables }: Record<string, any> = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (process.env.WORDPRESS_AUTH_REFRESH_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.WORDPRESS_AUTH_REFRESH_TOKEN}`;
    }

    // WPGraphQL Plugin must be enabled
    const res = await fetch(API_URL, {
        headers,
        method: 'POST',
        body: JSON.stringify({
            query,
            variables,
        }),
    });

    const json = await res.json();
    if (json.errors) {
        console.error(json.errors);
        throw new Error('Failed to fetch API');
    }
    return json.data;
}

export async function getCategories(): Promise<Categories> {
    const data = await fetchAPI(`
    {
      categories {
        edges {
          node {
            name
            slug
          }
        }
      }
    }
  `);
    data.categories.edges.push({ node: { name: 'KnowledgeWorker', slug: 'knowledgeworker' } });
    data.categories.edges.push({ node: { name: 'WP Pages', slug: 'wp_pages' } });
    return data?.categories;
}

export async function getAllPostsTitleExcerptSlug(): Promise<{ edges: [{ node: PostPreview }] }> {
    const data = await fetchAPI(`
    {
      posts {
        edges {
          node {
            title
            excerpt
            slug
          }
        }
      }
    }
  `);
    return data?.posts;
}

export async function getPostsTitleExcerptSlugByCategory(
    categorySlug: any
): Promise<{ category: { posts: { edges: { node: PostPreview }[] } } }> {
    if (categorySlug === 'knowledgeworker') {
        return {
            category: {
                posts: {
                    edges: [
                        {
                            node: {
                                title: 'Einführung in die künstliche Intelligenz',
                                excerpt: 'lorem ipsum dolor si amet',
                                slug: 'ki',
                            },
                        },
                        {
                            node: {
                                title: 'Programmierung und Softwareenwicklung',
                                excerpt: 'lorem ipsum dolor si amet',
                                slug: 'programmieren',
                            },
                        },
                    ],
                },
            },
        };
    } else if (categorySlug === 'wp_pages') {
        return {
            category: {
                posts: {
                    edges: [
                        {
                            node: {
                                title: 'nur eine Beispiel Seite',
                                excerpt: 'lorem ipsum dolor si amet',
                                slug: 'wp_page_test',
                            },
                        },
                    ],
                },
            },
        };
    }

    const data = await fetchAPI(
        `
    query CategoryByName($id: ID = "") {
      category(id: $id, idType: SLUG) {
        posts {
          edges {
            node {
              title
              slug
              excerpt
            }
          }
        }
      }
    }
    `,
        {
            variables: {
                id: categorySlug,
            },
        }
    );
    return data;
}

export async function getPost(slug: string | string[] | undefined): Promise<{ post: Post }> {
    const data = await fetchAPI(
        `
    fragment PostFields on Post {
      title
      excerpt
      slug
      date
      content
      tags {
        edges {
          node {
            name
          }
        }
      }
    }
    query PostBySlug($id: ID!, $idType: PostIdType!) {
      post(id: $id, idType: $idType) {
        ...PostFields
      }
    }
  `,
        {
            variables: {
                id: slug,
                idType: 'SLUG',
            },
        }
    );
    return data;
}
