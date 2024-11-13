import ContentWrapper from '@/components/learningContent/ContentWrapper';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import {
    getChildrenOfNodeByText,
    getMaterialNodesOfNodeByText,
    getNodeByText,
} from '@/lib/backend';
import { IMaterialNode, INode } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Dropdown from '@/components/common/Dropdown';
import { MdMenu } from 'react-icons/md';
import { useRouter } from 'next/router';
import { getClusterSlugByRouteQuery } from '../..';

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
    const [iframeHeight, setIframeHeight] = useState<string>('100%');

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            if (event.data.type == 'resize') {
                console.log('setIframeHeight', event.data);
                setIframeHeight(`${event.data.value}px`);
            }
        };

        window.addEventListener('message', messageHandler);
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, [iframeRef]);

    const ListOfLectionsSidebar = ({ lections }: { lections: IMaterialNode[] }) => (
        <ul className="flex flex-col divide-y gap-1 bg-white">
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
                    console.log({ value });
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
                ulClasses="!left-0 !right-auto max-w-96 w-fit"
            />
        </div>
    );

    return (
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
                <div className="md:mt-6 md:flex md:flex-row md:divide-x md:gap-1">
                    {props.lectionsOfNode.length && (
                        <div className="w-80 hidden md:block">
                            <ListOfLectionsSidebar lections={props.lectionsOfNode} />
                        </div>
                    )}

                    <div className="w-full md:pl-6 pt-1">
                        <iframe
                            style={{ height: iframeHeight }}
                            className="rounded-xl"
                            src={props.currentNode.data.url}
                            ref={iframeRef}
                        ></iframe>

                        {(props.prevNode || props.nextNode) && (
                            <div className="flex my-4 pt-4 border-t">
                                {/* <div className="my-8 border-t py-3 flex justify-between"> */}
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
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
}: GetServerSidePropsContext) => {
    const clusterSlug = getClusterSlugByRouteQuery(parseInt(params?.cluster as string));
    if (!clusterSlug) return { notFound: true };

    const nodesOfCluster = await getChildrenOfNodeByText(clusterSlug);
    const lectionsOfNode = await getMaterialNodesOfNodeByText(params?.node as string);
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
        },
    };
};
