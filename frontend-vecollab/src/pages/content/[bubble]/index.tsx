import Container from '@/components/Layout/container';
import LearningContentPreview from '@/components/learningContent/content-preview-li';
import HorizontalDivider from '@/components/learningContent/horizontal-divider';
import MainLearningContentLayout from '@/components/Layout/main-learning-content-layout';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getChildrenOfNodeByText, getMaterialNodesOfNodeByText } from '@/lib/backend';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import CategoryBox from '@/components/learningContent/category-box';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer.png';

interface Props {
    nodesOfBubble: INode[];
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function BubbleSelected(props: Props) {

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
            <HorizontalDivider />
            <Container>
                <MainLearningContentLayout
                    previewChildren={[]}
                    contentChildren={
                        <h1 className={'font-bold text-5xl text-center'}>
                            Bitte wählen Sie eine Lektion aus
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
    const nodesOfBubble = await getChildrenOfNodeByText(params?.bubble as string);

    return {
        props: {
            nodesOfBubble,
        },
    };
};
