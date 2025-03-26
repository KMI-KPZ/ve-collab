import ContentWrapper from '@/components/learningContent/ContentWrapper';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import {
    fetchTaxonomy,
    getChildrenOfNodeByText,
    getMaterialNodesOfNodeByText,
} from '@/lib/backend';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import Dropdown from '@/components/common/Dropdown';
import { MdMenu } from 'react-icons/md';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import CustomHead from '@/components/metaData/CustomHead';
import { useTranslation } from 'next-i18next';

interface Props {
    nodesOfCluster: INode[];
    lectionsOfNode: IMaterialNode[];
    currentNode: IMaterialNode;

    prevNode: IMaterialNode | null;
    nextNode: IMaterialNode | null;
    clusterSlug: string;
    nodeSlug: string;
}

// coming from previous page (only category chosen), a pos preview has been selected and therefore the content of the post is rendered as well
export default function LearningContentView(props: Props) {
    const router = useRouter();
    const iframeRef = useRef<null | HTMLIFrameElement>(null);
    const [frameHeight, setFrameHeight] = useState<string>('100%');
    const [loading, setLoading] = useState<boolean>(true);

    const slug = router.query.slug as string;
    const cluster = router.query.cluster as string;
    const node = router.query.node as string;
    const { t } = useTranslation('common');

    const framesizeRequest = () => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage(
            {
                type: 'docHeightRequest',
                value: true,
            },
            '*'
        );
    };

    const handleFramesizeRespond = (event: MessageEvent) => {
        if (event.data.type == 'docHeightRespond') {
            setLoading(false);
            setFrameHeight(`${event.data.value}px`);
        }
    };

    useEffect(() => {
        let reqDebounce: ReturnType<typeof setTimeout>;
        setFrameHeight('100%');
        setLoading(true);

        const resizedWindow = () => {
            setFrameHeight('100%');
            if (reqDebounce) clearTimeout(reqDebounce);
            reqDebounce = setTimeout(() => {
                framesizeRequest();
            }, 50);
        };

        window.addEventListener('message', handleFramesizeRespond);
        window.addEventListener('resize', resizedWindow);

        // first request after short delay
        setTimeout(() => {
            framesizeRequest();
        }, 150);

        // second request after some time to give nested iframes a chance to load
        setTimeout(() => {
            setLoading(false); // fallback if framesize respond failed
            framesizeRequest();
        }, 3000);

        return () => {
            if (reqDebounce) clearTimeout(reqDebounce);
            window.removeEventListener('message', handleFramesizeRespond);
            window.removeEventListener('resize', resizedWindow);
            setFrameHeight('100%');
        };
    }, [router]);

    const ListOfLectionsSidebar = ({ lections }: { lections: IMaterialNode[] }) => (
        <ul className="flex flex-col divide-y divide-gray-200 gap-1 bg-white">
            <li>
                <div className="font-konnect text-xl pb-2">Kapitel</div>
            </li>
            {lections.map((node) => (
                <li key={node.id}>
                    <Link
                        className={`p-2 w-full block ${
                            node.text == router.query.slug ? 'font-bold' : ''
                        }`}
                        scroll={false}
                        href={`/learning-material/${router.query.cluster}/${props.nodeSlug}/${node.text}`}
                    >
                        {node.text}
                    </Link>
                </li>
            ))}
        </ul>
    );

    const ListOfLectionsTopbar = ({ lections }: { lections: IMaterialNode[] }) => (
        <div>
            <span>|</span>
            <Dropdown
                icon={
                    <div className="flex items-center">
                        Kapitel
                        <MdMenu className="mx-2 my-0.5" />
                    </div>
                }
                onSelect={(value) => {
                    router.push(
                        `/learning-material/${router.query.cluster}/${props.nodeSlug}/${value}`
                    );
                }}
                options={lections.map((node) => {
                    return {
                        key: node.id,
                        label: node.text,
                        value: node.text,
                        liClasses: `${router.query.slug == node.text ? 'font-bold' : ''}`,
                    };
                })}
                ulClasses="left-0! right-auto! max-w-96 w-fit"
            />
        </div>
    );

    const slugUrl: string = `learning-material/${cluster}/${node}/${slug}`;
    const translateAttribute = `learning_materials_descriptions.learning-material/${cluster}/${encodeURIComponent(
        node
    )}/${encodeURIComponent(slug)}`;
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
                nodesOfCluster={props.nodesOfCluster}
                headerChildren={
                    <>
                        {props.lectionsOfNode.length && (
                            <div className="md:hidden">
                                <ListOfLectionsTopbar lections={props.lectionsOfNode} />
                            </div>
                        )}
                    </>
                }
                contentChildren={
                    <div className="md:mt-6 md:flex md:flex-row md:divide-x divide-gray-200 md:gap-1">
                        {props.lectionsOfNode.length && (
                            <div className="w-80 hidden md:block">
                                <ListOfLectionsSidebar lections={props.lectionsOfNode} />
                            </div>
                        )}

                        <div className="w-full md:pl-6 pt-1 relative">
                            {loading && (
                                <div className="absolute bg-white/50 backdrop-blur-xs md:-ml-6 inset-0">
                                    <span className="m-2">
                                        <LoadingAnimation />
                                    </span>
                                </div>
                            )}

                            <iframe
                                style={{ height: frameHeight }}
                                className="rounded-xl overflow-hidden"
                                src={props.currentNode.data.urls.de}
                                ref={iframeRef}
                                scrolling="no"
                            ></iframe>

                            {(props.prevNode || props.nextNode) && (
                                <div className="flex my-4 pt-4 border-t border-gray-200">
                                    {/* <div className="my-8 border-t border-t-gray-200 py-3 flex justify-between"> */}
                                    {props.prevNode && (
                                        <Link
                                            className="mr-auto"
                                            href={`/learning-material/${router.query.cluster}/${props.nodeSlug}/${props.prevNode.text}`}
                                        >
                                            <button
                                                className={
                                                    'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                }
                                            >
                                                zurück zu: {props.prevNode.text}
                                            </button>
                                        </Link>
                                    )}
                                    {props.nextNode && (
                                        <Link
                                            className="ml-auto"
                                            href={`/learning-material/${router.query.cluster}/${props.nodeSlug}/${props.nextNode.text}`}
                                        >
                                            <button
                                                className={
                                                    'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                }
                                            >
                                                weiter zu: {props.nextNode.text}
                                            </button>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
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
    if (!clusterSlug) return { notFound: true };

    const nodesOfCluster = await getChildrenOfNodeByText(clusterSlug, taxonomy);
    const lectionsOfNode = await getMaterialNodesOfNodeByText(params?.node as string, taxonomy);
    const currentNode = lectionsOfNode.find((node) => node.text === params?.slug);
    if (!currentNode) return { notFound: true };

    // compute previous and next sibling in the taxonomy for back/next button navigations
    const prevNodeIndex = lectionsOfNode.indexOf(currentNode) - 1;
    const nextNodeIndex = lectionsOfNode.indexOf(currentNode) + 1;
    const prevNode = prevNodeIndex >= 0 ? lectionsOfNode[prevNodeIndex] : null;
    const nextNode = nextNodeIndex < lectionsOfNode.length ? lectionsOfNode[nextNodeIndex] : null;

    return {
        props: {
            nodesOfCluster,
            lectionsOfNode,

            currentNode,

            prevNode,
            nextNode,
            clusterSlug,
            nodeSlug: params?.node,
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
};
