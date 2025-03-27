import ContentWrapper from '@/components/learningContent/ContentWrapper';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import {
    fetchTaxonomy,
    getChildrenOfNodeByText,
    getMaterialNodesOfNodeByText,
    getNodeByText,
} from '@/lib/backend';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CustomHead from '@/components/metaData/CustomHead';
import React from 'react';
import { useTranslation } from 'next-i18next';

interface Props {
    nodesOfCluster: INode[];
    lectionsOfNode: IMaterialNode[];
    clusterSlug: string;
    nodeSlug: string;
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function PageCategorySelected(props: Props) {
    const router = useRouter();
    const cluster = router.query.cluster as string;
    const node = router.query.node as string;
    const { t } = useTranslation('common');

    return (
        <>
            <CustomHead
                pageTitle={t('materials')}
                pageSlug={`learning-material/${cluster}/${node}`}
            />
            <ContentWrapper
                nodesOfCluster={props.nodesOfCluster}
                contentChildren={
                    <div className="mt-10 p-10 text-center ">
                        {props.lectionsOfNode.length > 0 ? (
                            <>
                                <LoadingAnimation />
                                <p className="mt-8">
                                    {t('redirecting_to_first_chapter')}
                                    <a
                                        className="underline text-ve-collab-blue"
                                        href={`/learning-material/${router.query.cluster}/${props.nodeSlug}/${props.lectionsOfNode[0].text}`}
                                    >
                                        {t("here")}
                                    </a>
                                </p>
                            </>
                        ) : (
                            <div className="italic">
                                {t("no_content_yet")}
                            </div>
                        )}
                    </div>
                }
            />
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
    locale,
}: GetServerSidePropsContext) => {
    const taxonomy = await fetchTaxonomy();

    const clusterSlug = params?.cluster as string;
    const currentNode = await getNodeByText(params?.node as string, taxonomy);

    if (!clusterSlug || !currentNode) {
        return { notFound: true, ...(await serverSideTranslations(locale ?? 'en', ['common'])) };
    }

    const nodesOfCluster = await getChildrenOfNodeByText(clusterSlug, taxonomy);
    const lectionsOfNode = await getMaterialNodesOfNodeByText(currentNode.text, taxonomy);

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
