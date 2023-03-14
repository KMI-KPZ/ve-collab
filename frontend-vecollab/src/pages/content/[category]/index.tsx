import Container from "@/components/Layout/container";
import LearningContentPreview from "@/components/learningContent/content-preview-li";
import HorizontalDivider from "@/components/learningContent/horizontal-divider";
import MainLearningContentLayout from "@/components/Layout/main-learning-content-layout";
import PageBanner from "@/components/learningContent/page-banner";
import { getCategories, getPostsTitleExcerptSlugByCategory } from "@/lib/api";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Categories, PostPreview } from "@/interfaces";

interface Props {
    categories: Categories,
    allPostsInCategory: {
        category: {
            posts: {
                edges: [
                    {
                        node: PostPreview
                    }
                ]
            }
        }
    }
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function PageCategorySelected(props: Props) {
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
                <MainLearningContentLayout previewChildren={postPreviews} contentChildren={<h1 className={"font-bold text-5xl text-center"}>wähle aus der Liste links!</h1>} />
            </Container>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async ({ params }: GetServerSidePropsContext) => {
    const categories = await getCategories();
    const allPostsInCategory = await getPostsTitleExcerptSlugByCategory(params?.category);

    return {
        props: {
            categories,
            allPostsInCategory
        }
    }
}