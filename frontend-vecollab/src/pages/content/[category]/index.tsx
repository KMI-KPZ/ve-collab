import Container from '@/components/Layout/container';
import LearningContentPreview from '@/components/learningContent/content-preview-li';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import PageBanner from '@/components/learningContent/page-banner';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getMaterialNodesOfNodeByText, getTopLevelNodes } from '@/lib/backend';
import { IMaterialNode, INode, ITopLevelNode } from '@/interfaces/material/materialInterfaces';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface Props {
    topLevelNodes: ITopLevelNode[];
    leafNodesOfTopNode: IMaterialNode[];
    categorySlug: string;
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function PageCategorySelected(props: Props) {
    const router = useRouter();

    const nodePreviews = props.leafNodesOfTopNode.map((node) => (
        <LearningContentPreview
            key={node.id}
            title={node.text}
            slug={node.text}
            snippet={node.data.description}
            imgFilename={'/images/example_image.jpg'}
        />
    ));

    useEffect(() => {
        if (!router.isReady) return;

        // if there are content nodes, immediately redirect to the first one
        if (props.leafNodesOfTopNode.length > 0) {
            router.push(`/content/${props.categorySlug}/${props.leafNodesOfTopNode[0].text}`);
        }
    }, [router, props]);

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
                            {props.leafNodesOfTopNode.length > 0 ? (
                                <>
                                    Sie werden automatisch zur 1. Lektion weitergeleitet, falls dies
                                    nicht funktioniert, klicken Sie bitte{' '}
                                    <a
                                        className="underline text-ve-collab-blue"
                                        href={`/content/${props.categorySlug}/${props.leafNodesOfTopNode[0].text}`}
                                    >
                                        hier
                                    </a>
                                </>
                            ) : (
                                'Leider gibt es noch keine Inhalte für diese Kategorie'
                            )}
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
            categorySlug: params?.category,
        },
    };
};
