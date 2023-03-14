import Container from "@/components/Layout/container";
import HorizontalDivider from "@/components/learningContent/horizontal-divider";
import MainLearningContentLayout from "@/components/Layout/main-learning-content-layout";
import PageBanner from "@/components/learningContent/page-banner";
import { getCategories } from "@/lib/api";
import { Categories } from "@/interfaces";

interface Props {
    categories: Categories
}

// Landing Page: no category (and therefore no content is chosen)
export default function PageCategoryNotSelected(props: Props) {
    return (
        <>
            <Container>
                <PageBanner categories={props.categories} />
            </Container>
            <HorizontalDivider />
            <Container>
                <MainLearningContentLayout previewChildren={<></>} contentChildren={<h1 className={"font-bold text-5xl text-center"}>wähle zunächst oben eine Kategorie aus</h1>} />
            </Container>
        </>
    )
}

export async function getServerSideProps() {
    const categories = await getCategories();

    return {
        props: {
            categories,
        }
    }
}