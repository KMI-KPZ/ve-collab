import Container from '@/components/Layout/container';
import LearningContentPreview from '@/components/learningContent/content-preview-li';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getChildrenOfNodeByText, getMaterialNodesOfNodeByText } from '@/lib/backend';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer.png';
import CategoryBox from '@/components/learningContent/category-box';

interface Props {
    nodesOfBubble: INode[];
    leafNodes: IMaterialNode[];
    materialNode: IMaterialNode;
    prevNode: IMaterialNode | null;
    nextNode: IMaterialNode | null;
    bubbleSlug: string;
    categorySlug: string;
}

// coming from previous page (only category chosen), a pos preview has been selected and therefore the content of the post is rendered as well
export default function LearningContentView(props: Props) {
    const nodePreviews = props.leafNodes.map((node) => (
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
            <div className="container mx-auto mb-4 px-5">
                <div className="mt-4">
                    <Link href="/content">
                        <div className="flex items-center">
                            <IoMdArrowRoundBack className="mr-2" />
                            <p className="text-ve-collab-orange underline">
                                Zurück zu den Clustern
                            </p>
                        </div>
                    </Link>
                </div>
                <div className={'h-24 mt-2 relative z-20 rounded-2xl overflow-hidden'}>
                    <Image fill src={blueBackground} alt={''} />
                    <div className={'absolute top-5 left-20 right-20'}>
                        <h1 className={'text-lg text-white font-bold text-center'}>
                            Lektionen in diesem Cluster:
                        </h1>
                    </div>
                </div>
                <ul className={'w-full flex relative -mt-10 justify-center z-20'}>
                    {props.nodesOfBubble.map((node) => (
                        <CategoryBox key={node.id} slug={node.text} categoryName={node.text} />
                    ))}
                </ul>
            </div>
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
                    bubbleSlug={props.bubbleSlug}
                    categorySlug={props.categorySlug}
                />
            </Container>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
}: GetServerSidePropsContext) => {
    const nodesOfBubble = await getChildrenOfNodeByText(params?.bubble as string);
    const leafNodes = await getMaterialNodesOfNodeByText(params?.category as string);
    const materialNode = leafNodes.find((node) => node.text === params?.slug);

    // compute previous and next sibling in the taxonomy for back/next button navigations
    const prevNodeIndex = leafNodes.indexOf(materialNode!) - 1;
    const nextNodeIndex = leafNodes.indexOf(materialNode!) + 1;
    const prevNode = prevNodeIndex >= 0 ? leafNodes[prevNodeIndex] : null;
    const nextNode = nextNodeIndex < leafNodes.length ? leafNodes[nextNodeIndex] : null;

    return {
        props: {
            nodesOfBubble,
            leafNodes,
            materialNode,
            prevNode,
            nextNode,
            bubbleSlug: params?.bubble,
            categorySlug: params?.category,
        },
    };
};
