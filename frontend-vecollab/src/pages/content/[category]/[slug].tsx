import Container from '@/components/Layout/container';
import LearningContentPreview from '@/components/learningContent/content-preview-li';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import PageBanner from '@/components/learningContent/page-banner';
import Post from '@/components/learningContent/post';
import { getCategories, getPost, getPostsTitleExcerptSlugByCategory } from '@/lib/api';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';

interface Props {
    categories: {
        edges: [
            {
                node: {
                    name: string;
                    slug: string;
                };
            }
        ];
    };
    allPostsInCategory: {
        category: {
            posts: {
                edges: [
                    {
                        node: {
                            title: string;
                            slug: string;
                            excerpt: string;
                        };
                    }
                ];
            };
        };
    };
    post?: {
        title: string;
        excerpt: string;
        slug: string;
        date: string;
        content: string;
        tags: {
            edges: [
                {
                    node: {
                        name: string;
                    };
                }
            ];
        };
    };
    knowledgeWorkerFrame?: boolean;
    WPPagesFrame?: boolean;
    slug?: string;
}

// coming from previous page (only category chosen), a pos preview has been selected and therefore the content of the post is rendered as well
export default function LearningContentView(props: Props) {
    const { posts } = props.allPostsInCategory.category;
    const postPreviews = posts.edges.map(({ node }) => (
        <LearningContentPreview
            key={node.title}
            title={node.title}
            slug={node.slug}
            snippet={node.excerpt.replace(/<\/?[^>]+(>|$)/g, '')}
            imgFilename={'/images/example_image.jpg'}
        /> //html needs to be filtered from excerpt
    ));

    return (
        <>
            <Container>
                <PageBanner categories={props.categories} />
            </Container>
            <HorizontalDivider />
            <Container>
                <MainLearningContentLayout
                    previewChildren={postPreviews}
                    contentChildren={
                        props.knowledgeWorkerFrame === true ? (
                            <iframe
                                className="rounded-xl mx-1"
                                src={`http://localhost:8888/knowledgeworker/${props.slug}/`}
                            ></iframe>
                        ) : props.WPPagesFrame === true ? (
                            <iframe
                                className="rounded-xl mx-1"
                                src={`https://soserve.rz.uni-leipzig.de:10001/content-test-page/`}
                            ></iframe>
                        ) : (
                            <Post post={props.post!} />
                        )
                    }
                />
            </Container>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
}: GetServerSidePropsContext) => {
    const categories = await getCategories();
    const allPostsInCategory = await getPostsTitleExcerptSlugByCategory(params?.category);

    if (params?.category === 'knowledgeworker') {
        return {
            props: {
                categories,
                knowledgeWorkerFrame: true,
                slug: params.slug,
                allPostsInCategory,
            },
        };
    } else if (params?.category === 'wp_pages') {
        return {
            props: {
                categories,
                WPPagesFrame: true,
                slug: params.slug,
                allPostsInCategory,
            },
        };
    }
    const currentPost = await getPost(params?.slug);

    return {
        props: {
            categories,
            post: currentPost.post,
            allPostsInCategory,
        },
    };
};
