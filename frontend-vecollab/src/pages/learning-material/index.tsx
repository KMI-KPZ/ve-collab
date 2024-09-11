import { getChildrenOfNode, getTopLevelNodes, useIsGlobalAdmin } from '@/lib/backend';
import { INode } from '@/interfaces/material/materialInterfaces';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TbBulb, TbClipboardList } from 'react-icons/tb';
import { GiPuzzle } from 'react-icons/gi';
import { FaLaptop } from 'react-icons/fa';
import { Tooltip } from '@/components/common/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';

export const ClusterRouteMapping: {[key: string]: {route: number, slug: string}} = {
    topBubble:      {route: 1, slug: 'top-bubble'},
    leftBubble:     {route: 2, slug: 'left-bubble'},
    rightBubble:    {route: 3, slug: 'right-bubble'},
    bottomBubble:   {route: 4, slug: 'bottom-bubble'},
}

export const getClusterSlugByRouteQuery = (nr: number) => {
    const cluster = Object.keys(ClusterRouteMapping).find((a) => ClusterRouteMapping[a].route == nr)
    return cluster ? ClusterRouteMapping[cluster].slug : undefined
}

const BubbleIcons: {[id: string]: (attr: {[key: string]: any}) => JSX.Element} = {
    [ClusterRouteMapping.topBubble.slug]:   (attr) => (<TbBulb {...attr} /> ),
    [ClusterRouteMapping.leftBubble.slug]:  (attr) => (<TbClipboardList {...attr} /> ),
    [ClusterRouteMapping.rightBubble.slug]: (attr) => (<FaLaptop {...attr} /> ),
    [ClusterRouteMapping.bottomBubble.slug]:(attr) => (<GiPuzzle {...attr} /> ),
}

export const getClusterIconBySlug = (slug: string) => BubbleIcons[slug] || ((attr: any) => (<></>))

const styleBubbleWrapper = "relative w-48 max-xl:mx-auto max-xl:my-24"
const styleBubbleMain = `group block relative h-48 w-48 z-10 rounded-full
    bg-footer-pattern bg-center drop-shadow-lg opacity-85 flex justify-center items-center #
    transition ease-in-out delay-150 duration-300 hover:-translate-y-1 hover:scale-110`
const styleBubbleLeaf = `block absolute px-6 py-3 min-w-24 max-w-48 rounded-full bg-white
    flex font-konnect items-center justify-center text-center text-ve-collab-blue drop-shadow-lg
    hover:text-ve-collab-orange hover:border-ve-collab-orange transition ease-in-out delay-150 duration-300
    hover:-translate-y-105 hover:scale-110`

interface Props {
    nodes: { [key: string]: INode[] };
}

// Landing Page: no category (and therefore no learning-material is chosen)
export default function PageCategoryNotSelected(props: Props) {
    const { data: session } = useSession();
    const isUserAdmin = useIsGlobalAdmin(session ? session.accessToken : '');

    const Bubble = (querySlug: number, wrapperStyle: string, nodes: string[]) => {
        const slug = getClusterSlugByRouteQuery(querySlug)
        if (!slug) return (<></>)
        return (
            <div
                className={`${styleBubbleWrapper} ${wrapperStyle}`}
            >
                <Link href={`/learning-material/${querySlug}`}
                    className={`${styleBubbleMain} hover:cursor-pointer`}
                >
                    {getClusterIconBySlug(slug)({
                        size: 100,
                        className: "text-white transition-colors group-hover:text-ve-collab-orange"
                    })}
                </Link>
                {nodes.map((style, i) => (
                    <Link
                        key={i}
                        href={`/learning-material/${querySlug}/${props.nodes[slug][i].text}`}
                        className={`${styleBubbleLeaf} ${style}`}
                    >
                        {props.nodes[slug][i].text}
                    </Link>
                ))}
            </div>
        )
    }

    const Bubbles = () => (
        <>
            {/* TOP BUBBLE */}
            {Bubble(1, 'xl:left-[37%] xl:-translate-x-1/1',
                [
                    '-top-[1.5rem] -left-[5rem]',
                    'top-[.5rem] -right-[6.5rem]',
                    '-bottom-[2.5rem] -right-[7rem]',
                    '-bottom-[.5rem] -left-[10rem]',
                ]
            )}

            {/* LEFT BUBBLE */}
            {Bubble(2, 'xl:top-[3rem] xl:left-[17%] xl:-translate-x-1/2',
                [
                    '-top-[2rem] -left-[7rem]',
                    '-bottom-[1.5rem] -right-[5rem]',
                ]
            )}

            {/* RIGHT BUBBLE */}
            {Bubble(3, 'xl:-top-[13rem] xl:left-[77%] xl:-translate-x-1/2',
                [
                    '-top-[3rem] -left-[5rem]', // digitale medien
                    '-bottom-[3.5rem] -right-[7rem]', // datenschutz
                    'bottom-0 -left-[4rem]', // tools
                    'top-0 -right-[4rem]', // oer
                ]
            )}

            {/* BOTTOM BUBBLE */}
            {Bubble(4, 'xl:top-[-9rem] xl:left-[52%] xl:-translate-x-1/2',
                [
                    '-bottom-[.5rem] -left-[11rem]', // interaktion
                    '-top-[2rem] -right-[6rem]', // kulturelle aspekte
                    '-bottom-[2.5rem] -right-[8rem]', // sprachliche aspekte
                ]
            )}
        </>
    )

    return (
        <>
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue bg-no-repeat">
                <div className="container mx-auto px-5">
                    <div className="flex justify-between pt-12 mb-4">
                        <div>
                            {/* <div className={'font-bold text-4xl mb-2'}>Selbstlernmaterialien</div> */}
                            {/* <div className="w-fit py-3 px-4 mb-2 font-bold text-4xl text-slate-600 border-b-4 border-ve-collab-blue rounded-md bg-ve-collab-blue-light">
                                Selbstlernmaterialien
                            </div> */}
                            <div className='mb-3 text-4xl font-bold underline decoration-ve-collab-blue decoration-4 underline-offset-8'>
                                Selbstlernmaterialien
                            </div>
                            <div className={'text-gray-500 text-xl'}>
                                Herzlich Willkommen zum stetig wachsenden Qualifizierungsangebot von VE-Collab!
                            </div>
                        </div>
                        <div className='flex'>
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
                            <Tooltip tooltipsText={"Mehr Infos …"}>
                                <Link
                                    href={"/"}
                                    className="rounded-full shadow bg-slate-50 hover:bg-gray-50 p-2 mx-2"
                                >
                                    <PiBookOpenText
                                        size={30}
                                        color="#00748f"
                                        className="inline relative"
                                    />
                                </Link>
                            </Tooltip>
                        </div>
                    </div>

                    <div className='columns-2 gab-6 mb-6'>
                        Sie interessieren sich für virtuelle Austausche, haben aber noch kein oder wenig Vorwissen zum Thema? Dann helfen Ihnen die Materialien dabei, ins Thema einzutauchen und unterstützen Sie Schritt für Schritt auf dem Weg hin zu Ihrem ersten eigenen virtuellen Austausch.
                        Sie konnten bereits Erfahrung mit VA sammeln? Dann können Sie hier Ihr Wissen in den für Sie relevanten Themengebieten vertiefen, Ihre bisherigen Erfahrungen reflektieren und sich u. a. von aktuellen Links und Artikeln für die eigene Praxis und Forschung inspirieren lassen.
                    </div>

                    <div className="relative mx-8 border-slate-500 border-t xl:mt-6 xl:pt-12 xl:-mb-[3rem]">
                        <Bubbles />
                    </div>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps() {
    const cluster = await getTopLevelNodes();
    const nodes: { [key: string]: INode[] } = {};

    await Promise.all(
        cluster.map(async (bubble) => {
            const nodesInBubble = await getChildrenOfNode(bubble.id);
            nodes[bubble.text] = nodesInBubble;
        })
    );

    return {
        props: {
            nodes,
        },
    };
}
