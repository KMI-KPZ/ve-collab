import ContentWrapper from '@/components/learningContent/ContentWrapper';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getNodeByText, getNodesOfNodeWithLections } from '@/lib/backend';
import { INodeWithLections } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RxDot } from 'react-icons/rx';
import { getClusterSlugByRouteQuery } from '..';

interface Props {
    nodesWithLectionsOfCluster: INodeWithLections[];
}

// coming from landing page: category has been chosen, depending on categories, previews to the posts are shown on the left
export default function BubbleSelected(props: Props) {
    const router = useRouter();

    return (
        <ContentWrapper
            contentChildren={<>
                <div className='my-6 -mx-4 px-6 text-3xl font-semibold text-slate-600'>
                    Module & Kapitel
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

                <div className='mx-10 px-6 mb-6 flex flex-row flex-wrap gap-x-8 gap-y-4'>
                    {props.nodesWithLectionsOfCluster.map(node => {
                        return (
                            <div key={node.id} className='basis-1/4 max-w-96'>
                                <div className='py-2 text-xl font-konnect truncate text-ve-collab-blue border-b hover:text-ve-collab-orange transition-colors'>
                                    <Link href={`/learning-material/${router.query.cluster}/${node.text}`}>
                                        {node.text}
                                    </Link>
                                </div>
                                <ul className=''>
                                    {node.lections.length == 0 && (
                                        <div className='italic my-2 text-wrap'>Leider gibt es noch keine Inhalte für dieses Modul</div>
                                    )}
                                    {node.lections.map(lection => (
                                        <li key={lection.id} className='max-w-full truncate'>
                                            <Link href={`/learning-material/${router.query.cluster}/${node.text}/${lection.text}`}
                                                className='my-2 flex items-center max-w-full truncate'
                                            >
                                                <RxDot />
                                                <div className='mx-3 py-1 max-w-full truncate'>
                                                    {lection.text}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </>}
        />
    )
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
}: GetServerSidePropsContext) => {
    const clusterSlug = getClusterSlugByRouteQuery(parseInt(params?.cluster as string));

    if (!clusterSlug) {
        return { notFound: true }
    }

    const currentCluster = await getNodeByText(clusterSlug);
    const nodesWithLectionsOfCluster = await getNodesOfNodeWithLections(currentCluster);

    return {
        props: {
            nodesWithLectionsOfCluster,
        },
    };
};