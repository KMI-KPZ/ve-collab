import {
    fetchTaxonomy,
    getChildrenOfNode,
    getMaterialNodesOfNodeByText,
    getTopLevelNodes,
    useIsGlobalAdmin,
} from '@/lib/backend';
import { INode } from '@/interfaces/material/materialInterfaces';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TbBulb, TbClipboardList } from 'react-icons/tb';
import { GiPuzzle } from 'react-icons/gi';
import { FaLaptop } from 'react-icons/fa';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import CustomHead from '@/components/metaData/CustomHead';
import React from 'react';

export const ClusterRouteMapping: { [key: string]: { slug: string } } = {
    topBubble: { slug: 'Grundlagen' },
    leftBubble: { slug: 'Zusammen Planen' },
    rightBubble: { slug: 'Digitales' },
    bottomBubble: { slug: 'Zusammen Lernen' },
};

const BubbleIcons: { [id: string]: (attr: { [key: string]: any }) => JSX.Element } = {
    [ClusterRouteMapping.topBubble.slug]: (attr) => <TbBulb {...attr} />,
    [ClusterRouteMapping.leftBubble.slug]: (attr) => <TbClipboardList {...attr} />,
    [ClusterRouteMapping.rightBubble.slug]: (attr) => <FaLaptop {...attr} />,
    [ClusterRouteMapping.bottomBubble.slug]: (attr) => <GiPuzzle {...attr} />,
};

export const getClusterIconBySlug = (slug: string) => BubbleIcons[slug] || (() => <></>);

const styleBubbleWrapper = 'relative w-48 mx-auto my-24 xl:mx-0 xl:my-0';
const styleBubbleMain = `group block relative h-48 w-48 z-10 rounded-full
    bg-footer-pattern bg-center shadow-lg opacity-85 flex justify-center items-center
    transition ease-in-out delay-150 duration-300 hover:-translate-y-1 hover:scale-110`;
const styleBubbleLeaf = `block absolute px-6 py-3 min-w-24 max-w-48 rounded-full bg-white
    flex font-konnect items-center justify-center text-center text-ve-collab-blue shadow-lg
    hover:text-ve-collab-orange hover:border-ve-collab-orange transition ease-in-out delay-150 duration-300
    hover:scale-110`;

interface Props {
    nodes: { [key: string]: INode[] };
    cluster: any;
    materials: any;
    urls: any;
}

// Landing Page: no category (and therefore no learning-material is chosen)
export default function PageCategoryNotSelected(props: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const router = useRouter();

    const isUserAdmin = useIsGlobalAdmin(session ? session.accessToken : '');

    const Bubble = (querySlug: string, wrapperStyle: string, nodes: string[]) => {
        if (!querySlug) return <></>;
        return (
            <div className={`${styleBubbleWrapper} ${wrapperStyle}`}>
                <Link
                    href={`/learning-material/${querySlug}`}
                    className={`${styleBubbleMain} hover:cursor-pointer`}
                    title={querySlug}
                >
                    {getClusterIconBySlug(querySlug)({
                        size: 100,
                        className: 'text-white transition-colors group-hover:text-ve-collab-orange',
                    })}
                </Link>
                {nodes.map((style, i) => (
                    <div key={i}>
                        {props.nodes[querySlug][i]?.text && (
                            <Link
                                href={`/learning-material/${querySlug}/${props.nodes[querySlug][i]?.text}`}
                                className={`${styleBubbleLeaf} ${style}`}
                            >
                                {router.locale === 'en' && props.nodes[querySlug][i]?.text_en
                                    ? props.nodes[querySlug][i]?.text_en
                                    : props.nodes[querySlug][i]?.text}
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const Bubbles = () => (
        <>
            {/* 1 BUBBLE */}
            {Bubble('Grundlagen', 'xl:left-[50%] xl:-translate-x-full', [
                '-top-[1.5rem] -left-[5rem]', //einfuehrung
                'top-[.5rem] -right-[6.5rem]', // potenziale
                '-bottom-[2.2rem] -right-[7rem]', // herausforderungen
                '-bottom-[.5rem] -left-[10rem]', // beispiele aus der praxis
            ])}

            {/* 2 BUBBLE */}
            {Bubble('Zusammen Planen', 'xl:top-[3rem] xl:left-[17%] xl:-translate-x-1/2', [
                '-top-[2rem] -left-[5rem]', // va-planung
                '-bottom-[1.5rem] -right-[5rem]', // evaluation
                '-bottom-[.5rem] -left-[10rem]' // leitfragen Aushandlungsphase
            ])}

            {/* 3 BUBBLE */}
            {Bubble('Digitales', 'xl:-top-[13rem] xl:left-[77%] xl:-translate-x-1/2', [
                '-bottom-[3.5rem] -right-[6.5rem]', // tools
                '-top-[1.5rem] -left-[3rem]', // oer
            ])}

            {/* 4 BUBBLE */}
            {Bubble('Zusammen Lernen', 'mt-30 xl:top-[-9rem] xl:left-[52%] xl:-translate-x-1/2', [
                '-bottom-[-2.5rem] -left-[10.5rem]', // game based learning
                '-top-[2rem] -right-[6rem]', // kulturelle aspekte
                '-bottom-[-0.5rem] -right-[10rem]', // sprachliche aspekte
                '-top-[1.5rem] -left-[6.5rem]', //methodenkoffer
                '-bottom-[4rem] -left-[3rem]', // controversiality
            ])}
        </>
    );

    return (
        <>
            <CustomHead
                pageTitle={t('materials')}
                pageSlug={`learning-material`}
                pageDescription={t('materials_description')}
            />
            <div className="flex justify-between pt-12 mb-4">
                <div>
                    <div className="mb-3 text-4xl font-bold underline decoration-ve-collab-blue decoration-4 underline-offset-8">
                        {t('materials')}
                    </div>
                    <div className={'text-gray-500 text-xl'}>{t('materials_welcome')}</div>
                </div>
                <div className="flex">
                    {isUserAdmin && (
                        <div className="">
                            <Link
                                className={'bg-ve-collab-orange text-white rounded-lg px-4 py-2'}
                                href={'/learning-material/edit'}
                            >
                                Bearbeiten
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <div className="columns-2 gab-6 mb-6">{t('materials_intro_text')}</div>

            {/* disclaimer message if language is set to non-german */}
            {router.locale !== 'de' && (
                <div className="text-gray-500 text-sm">{t('materials_only_german')}</div>
            )}

            <div className="relative mx-8 border-t-2 border-ve-collab-blue/50 xl:mt-6 xl:pt-12 xl:-mb-[3rem]">
                <Bubbles />
            </div>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    const taxonomy = await fetchTaxonomy();

    const cluster = await getTopLevelNodes(taxonomy);
    const nodes: { [key: string]: INode[] } = {};

    await Promise.all(
        cluster.map(async (bubble) => {
            nodes[bubble.text] = await getChildrenOfNode(bubble.id, taxonomy);
        })
    );

    const materials = await Promise.all(
        Object.values(nodes).flatMap(async (nodeArray) =>
            Promise.all(
                nodeArray.map(async (node) => {
                    const learning_page = await getMaterialNodesOfNodeByText(node.text, taxonomy);
                    return {
                        node_text: node.text,
                        learning_page: learning_page,
                        cluster_id: (node.parent % 10) + 1, // get last digit
                    };
                })
            )
        )
    ).then((results) => results.flat());

    const urls = await Promise.all(
        materials.map((material: any) => {
            let url = `${encodeURIComponent(material.cluster_id)}/${encodeURIComponent(
                material.node_text
            )}`;
            return material.learning_page.map(
                (page: any) => `${url}/${encodeURIComponent(page.text)}`
            );
        })
    );

    return {
        props: {
            materials,
            cluster,
            nodes,
            urls,
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
