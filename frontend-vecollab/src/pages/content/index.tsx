import Container from '@/components/Layout/container';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import PageBanner from '@/components/learningContent/page-banner';
import { getTopLevelNodes } from '@/lib/backend';
import { ITopLevelNode } from '@/interfaces/material/materialInterfaces';

interface Props {
    topLevelNodes: ITopLevelNode[];
}

// Landing Page: no category (and therefore no content is chosen)
export default function PageCategoryNotSelected(props: Props) {
    return (
        <>
            <Container>
                <PageBanner topLevelNodes={props.topLevelNodes} />
            </Container>
            <HorizontalDivider />
            <Container>
                <MainLearningContentLayout
                    previewChildren={<></>}
                    contentChildren={
                        <h1 className={'font-bold text-5xl text-center'}>
                            wähle zunächst oben eine Kategorie aus
                        </h1>
                    }
                />
            </Container>
        </>
    );
}

export async function getServerSideProps() {
    const topLevelNodes = await getTopLevelNodes();

    return {
        props: {
            topLevelNodes,
        },
    };
}
