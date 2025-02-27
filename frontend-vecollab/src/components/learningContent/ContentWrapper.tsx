import { INode } from '@/interfaces/material/materialInterfaces';
import Link from 'next/link';
import { MdArrowRight, MdHome } from 'react-icons/md';
import { useRouter } from 'next/router';
import Dropdown from '../common/Dropdown';
import { getClusterIconBySlug } from '@/pages/learning-material';
import WhiteBox from '../common/WhiteBox';

interface Props {
    headerChildren?: JSX.Element
    contentChildren: JSX.Element | JSX.Element[];
    nodesOfCluster?: INode[];
}

export default function ContentWrapper({
    headerChildren,
    contentChildren,
    nodesOfCluster,
}: Props) {
    const router = useRouter();

    const {
        cluster: clusterRouterQuery,
        node: categorySlug
    } = router.query

    const clusterSlug = clusterRouterQuery as string
    const clusterIcon = clusterSlug ? getClusterIconBySlug(clusterSlug) : undefined

    return (
        <>
            <WhiteBox>
                <div className="flex flex-col">
                    <div className="pb-2 flex flex-wrap items-center border-b">
                        <div className="flex items-center">
                            <Link
                                href={`/learning-material/${router.query.cluster}`}
                                className='relative h-14 w-14 px-2 flex items-center justify-center rounded-full bg-footer-pattern bg-center shadow'
                            >
                                {typeof clusterIcon !== 'undefined' && (<>
                                    {clusterIcon({
                                        size: 30,
                                        className: "text-white transition-colors hover:text-ve-collab-orange"
                                    })}
                                </>)}

                            </Link>

                            {typeof nodesOfCluster !== 'undefined' && (
                                <div className='inline-block'>
                                    <Dropdown
                                        onSelect={value => {
                                            const selectedNode = nodesOfCluster.find(a => a.id == parseInt(value))
                                            if (!selectedNode) return
                                            router.push(`/learning-material/${router.query.cluster}/${selectedNode.text}`)
                                        }}
                                        options={
                                            nodesOfCluster.map((node) => {
                                                return {
                                                    key: node.id,
                                                    label: node.text,
                                                    value: node.id.toString(),
                                                    liClasses: `max-w-full my-2 mx-2 truncate px-4 py-2
                                                        hover:text-ve-collab-orange hover:!bg-white transition-colors
                                                        ${categorySlug == node.text ? "font-bold" : ""}`
                                                }
                                            })
                                        }
                                        icon={
                                            <div className='flex items-center px-2 py-2 text-ve-collab-blue hover:text-ve-collab-orange transition-colors'>
                                                <MdArrowRight className='inline mx-1' />
                                                {categorySlug}
                                            </div>
                                        }
                                        ulClasses='w-fit max-w-96 !left-0'
                                    />
                                </div>
                            )}
                            {/* <span className="ml-4 text-2xl text-slate-400">• {props.categorySlug}</span> */}
                        </div>

                        {headerChildren}

                        <Link href="/learning-material"
                            className="ml-auto block mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                        >
                            <MdHome />
                        </Link>
                    </div>

                    {contentChildren}
                </div>
            </WhiteBox>
        </>
    );
}
