import Container from '@/components/Layout/container';
import LearningContentPreview from '@/components/learningContent/content-preview-li';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import PageBanner from '@/components/learningContent/page-banner';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getMaterialNodesOfNodeByText, getTopLevelNodes } from '@/lib/backend';
import { IMaterialNode, INode, ITopLevelNode } from '@/interfaces/material/materialInterfaces';

interface Props {
    topLevelNodes: ITopLevelNode[];
    leafNodesOfTopNode: IMaterialNode[];
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function PageCategorySelected(props: Props) {
    const nodePreviews = props.leafNodesOfTopNode.map((node) => (
        <LearningContentPreview
            key={node.id}
            title={node.text}
            slug={node.text}
            snippet={node.data.description}
            imgFilename={'/images/example_image.jpg'}
        />
    ));

    return (
        <>
            <Container>
                <PageBanner topLevelNodes={props.topLevelNodes} />
            </Container>
            <HorizontalDivider />
            <Container>
                <MainLearningContentLayout
                    previewChildren={nodePreviews}
                    contentChildren={
                        <h1 className={'font-bold text-5xl text-center'}>
                            wähle aus der Liste links!
                        </h1>
                    }
                />
            </Container>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
}: GetServerSidePropsContext) => {
    const topLevelNodes = await getTopLevelNodes();
    const leafNodesOfTopNode = await getMaterialNodesOfNodeByText(params?.category as string);

    return {
        props: {
            topLevelNodes,
            leafNodesOfTopNode,
        },
    };
};
