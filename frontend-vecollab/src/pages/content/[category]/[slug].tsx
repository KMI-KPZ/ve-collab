import Container from '@/components/Layout/container';
import LearningContentPreview from '@/components/learningContent/content-preview-li';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import PageBanner from '@/components/learningContent/page-banner';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getMaterialNodesOfNodeByText, getTopLevelNodes } from '@/lib/backend';
import { IMaterialNode, ITopLevelNode } from '@/interfaces/material/materialInterfaces';

interface Props {
    topLevelNodes: ITopLevelNode[];
    leafNodesOfTopNode: IMaterialNode[];
    materialNode: IMaterialNode;
    prevNode: IMaterialNode | null;
    nextNode: IMaterialNode | null;
    categorySlug: string;
}

// coming from previous page (only category chosen), a pos preview has been selected and therefore the content of the post is rendered as well
export default function LearningContentView(props: Props) {
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
                        <iframe
                            className="rounded-xl mx-1 h-[90vh]"
                            src={props.materialNode.data.url}
                        ></iframe>
                    }
                    prevNode={props.prevNode}
                    nextNode={props.nextNode}
                    categorySlug={props.categorySlug}
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
    const materialNode = leafNodesOfTopNode.find((node) => node.text === params?.slug);

    // compute previous and next sibling in the taxonomy for back/next button navigations
    const prevNodeIndex = leafNodesOfTopNode.indexOf(materialNode!) - 1;
    const nextNodeIndex = leafNodesOfTopNode.indexOf(materialNode!) + 1;
    const prevNode = prevNodeIndex >= 0 ? leafNodesOfTopNode[prevNodeIndex] : null;
    const nextNode =
        nextNodeIndex < leafNodesOfTopNode.length ? leafNodesOfTopNode[nextNodeIndex] : null;

    return {
        props: {
            topLevelNodes,
            leafNodesOfTopNode,
            materialNode,
            prevNode,
            nextNode,
            categorySlug: params?.category,
        },
    };
};
