import Container from "@/components/Layout/container";
import LearningContentPreview from "@/components/learningContent/content-preview-li";
import HorizontalDivider from "@/components/learningContent/horizontal-divider";
import MainLearningContentLayout from "@/components/Layout/main-learning-content-layout";
import PageBanner from "@/components/learningContent/page-banner";
import Post from "@/components/learningContent/post";
import { getCategories, getPost, getPostsTitleExcerptSlugByCategory } from "@/lib/api";
import { GetServerSideProps, GetServerSidePropsContext } from "next";

interface Props {
    categories: {
        edges: [
            {
                node: {
                    name: string,
                    slug: string
                }
            }
        ]
    },
    allPostsInCategory: {
        category: {
            posts: {
                edges: [
                    {
                        node: {
                            title: string,
                            slug: string,
                            excerpt: string
                        }
                    }
                ]
            }
        }
    },
    post: {
        title: string,
        excerpt: string,
        slug: string,
        date: string,
        content: string,
        tags: {
            edges: [
                {
                    node: {
                        name: string
                    }
                }
            ]
        }
    }
}

// coming from previous page (only category chosen), a pos preview has been selected and therefore the content of the post is rendered as well
export default function LearningContentView(props: Props) {
    const { posts } = props.allPostsInCategory.category
    const postPreviews = posts.edges.map(({ node }) => (
        <LearningContentPreview key={node.title} title={node.title} slug={node.slug} snippet={node.excerpt.replace(/<\/?[^>]+(>|$)/g, "")} imgFilename={"/images/example_image.jpg"} /> //html needs to be filtered from excerpt
    ))

    return (
        <>
            <Container>
                <PageBanner categories={props.categories} />
            </Container>
            <HorizontalDivider />
            <Container>
                <MainLearningContentLayout previewChildren={postPreviews} contentChildren={<Post post={props.post} />} />
            </Container>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async ({ params }: GetServerSidePropsContext) => {
    const categories = await getCategories();
    const allPostsInCategory = await getPostsTitleExcerptSlugByCategory(params?.category);
    const currentPost = await getPost(params?.slug);

    return {
        props: {
            categories,
            post: currentPost.post,
            allPostsInCategory
        }
    }
}