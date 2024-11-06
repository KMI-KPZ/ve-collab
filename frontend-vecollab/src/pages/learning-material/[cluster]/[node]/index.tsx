import ContentWrapper from '@/components/learningContent/ContentWrapper';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import {
    getChildrenOfNodeByText,
    getMaterialNodesOfNodeByText,
    getNodeByText,
} from '@/lib/backend';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { getClusterSlugByRouteQuery } from '../..';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

interface Props {
    nodesOfCluster: INode[];
    lectionsOfNode: IMaterialNode[];
    clusterSlug: string;
    nodeSlug: string;
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function PageCategorySelected(props: Props) {
    const router = useRouter();

    return (
        <ContentWrapper
            nodesOfCluster={props.nodesOfCluster}
            contentChildren={
                <div className="mt-10 p-10 text-center ">
                    {props.lectionsOfNode.length > 0 ? (
                        <>
                            <LoadingAnimation />
                            <p className="mt-8">
                                Sie werden automatisch zum 1. Kapitel weitergeleitet, falls dies
                                nicht funktioniert, klicken Sie bitte{' '}
                                <a
                                    className="underline text-ve-collab-blue"
                                    href={`/learning-material/${router.query.cluster}/${props.nodeSlug}/${props.lectionsOfNode[0].text}`}
                                >
                                    hier
                                </a>
                            </p>
                        </>
                    ) : (
                        <div className="italic">
                            Leider gibt es noch keine Inhalte für dieses Modul
                        </div>
                    )}
                </div>
            }
        />
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
    locale,
}: GetServerSidePropsContext) => {
    const clusterSlug = getClusterSlugByRouteQuery(parseInt(params?.cluster as string));
    const currentNode = await getNodeByText(params?.node as string);

    if (!clusterSlug || !currentNode) {
        return { notFound: true, ...(await serverSideTranslations(locale ?? 'en', ['common'])) };
    }

    const nodesOfCluster = await getChildrenOfNodeByText(clusterSlug);
    const lectionsOfNode = await getMaterialNodesOfNodeByText(currentNode.text);

    if (lectionsOfNode.length > 0) {
        return {
            redirect: {
                destination: `/learning-material/${params?.cluster}/${params?.node}/${lectionsOfNode[0].text}`,
                permanent: false,
                ...(await serverSideTranslations(locale ?? 'en', ['common'])),
            },
        };
    }

    return {
        props: {
            nodesOfCluster,
            lectionsOfNode,
            clusterSlug,
            nodeSlug: currentNode.text,
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
};
