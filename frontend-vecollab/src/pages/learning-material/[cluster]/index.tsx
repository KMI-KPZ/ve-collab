import ContentWrapper from '@/components/learningContent/ContentWrapper';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { fetchTaxonomy, getNodeByText, getNodesOfNodeWithLections } from '@/lib/backend';
import { INodeWithLections } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RxDot } from 'react-icons/rx';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CustomHead from '@/components/metaData/CustomHead';
import React from 'react';
import { useTranslation } from 'next-i18next';

interface Props {
    nodesWithLectionsOfCluster: INodeWithLections[];
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function BubbleSelected(props: Props) {
    const router = useRouter();
    const cluster = router.query.cluster as string;
    const { t } = useTranslation('common');

    const slugUrl: string = `learning-material/${cluster}`;
    const translateAttribute = `learning_materials_descriptions.${slugUrl}`;
    const getPageDescription: string =
        t(translateAttribute) !== translateAttribute
            ? t(translateAttribute)
            : t('frontpage.description');
    return (
        <>
            <CustomHead
                pageTitle={t('materials')}
                pageSlug={slugUrl}
                pageDescription={getPageDescription}
            />
            <ContentWrapper
                contentChildren={
                    <>
                        <div className="my-6 -mx-4 px-6 text-3xl font-semibold text-slate-600">
                            {t('modules_and_chapters')}
                        </div>

                        {/* <div className='my-6 -mx-4 text-3xl font-semibold text-slate-600 underline decoration-ve-collab-blue decoration-3 underline-offset-6'>
                    Module & Kapitel
                </div> */}

                        {/* <div className='font-semibold text-3xl text-white text-center my-6 bg-ve-collab-blue rounded-full py-3 -mx-4'>
                    Module & Kapitel
                </div> */}

                        {/* <div className='w-fit my-6 py-3 -mx-4 px-4 font-semibold text-3xl text-slate-600 border-b-4 border-ve-collab-blue rounded-md bg-ve-collab-blue-light'>
                    Module & Kapitel
                </div> */}

                        <div className="mx-10 px-6 mb-6 flex flex-row flex-wrap gap-x-8 gap-y-4">
                            {props.nodesWithLectionsOfCluster.map((node) => {
                                return (
                                    <div key={node.id} className="basis-1/4 max-w-96">
                                        <div className="py-2 text-xl font-konnect truncate text-ve-collab-blue border-b border-b-gray-200 hover:text-ve-collab-orange transition-colors">
                                            <Link
                                                href={`/learning-material/${router.query.cluster}/${node.text}`}
                                            >
                                                {router.locale === 'en' && node.text_en
                                                    ? node.text_en
                                                    : node.text}
                                            </Link>
                                        </div>
                                        <ul className="">
                                            {node.lections.length == 0 && (
                                                <div className="italic my-2 text-wrap">
                                                    {t('no_content_yet')}
                                                </div>
                                            )}
                                            {node.lections.map((lection) => (
                                                <li
                                                    key={lection.id}
                                                    className="max-w-full truncate"
                                                >
                                                    <Link
                                                        href={`/learning-material/${router.query.cluster}/${node.text}/${lection.text}`}
                                                        className="my-2 flex items-center max-w-full truncate"
                                                    >
                                                        <RxDot />
                                                        <div className="mx-3 py-1 max-w-full truncate">
                                                            {router.locale === 'en' &&
                                                            lection.text_en
                                                                ? lection.text_en
                                                                : lection.text}
                                                        </div>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                }
            />
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
    locale,
}: GetServerSidePropsContext) => {
    const clusterSlug = params?.cluster as string;

    if (!clusterSlug) {
        return { notFound: true, ...(await serverSideTranslations(locale ?? 'en', ['common'])) };
    }

    const taxonomy = await fetchTaxonomy();
    const currentCluster = await getNodeByText(clusterSlug, taxonomy);
    const nodesWithLectionsOfCluster = await getNodesOfNodeWithLections(currentCluster, taxonomy);

    return {
        props: {
            nodesWithLectionsOfCluster,
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
};
