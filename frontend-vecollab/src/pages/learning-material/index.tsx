import Container from '@/components/Layout/container';
import { getChildrenOfNode, getTopLevelNodes, useIsGlobalAdmin } from '@/lib/backend';
import { INode } from '@/interfaces/material/materialInterfaces';
import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TbBulb, TbClipboardList } from 'react-icons/tb';
import { GiPuzzle } from 'react-icons/gi';
import { FaLaptop } from 'react-icons/fa';

interface Props {
    mapping: { [key: string]: INode[] };
}

// Landing Page: no category (and therefore no learning-material is chosen)
export default function PageCategoryNotSelected(props: Props) {
    const { data: session } = useSession();

    const title = 'SELBSTLERNMATERIALIEN';
    const text = 'Herzlich Willkommen zum stetig wachsenden Qualifizierungsangebot von VE-Collab!';
    const text2 =
        'Sie interessieren sich für virtuelle Austausche, haben aber noch kein oder wenig Vorwissen zum Thema? Dann helfen Ihnen die Materialien dabei, ins Thema einzutauchen und unterstützen Sie Schritt für Schritt auf dem Weg hin zu Ihrem ersten eigenen virtuellen Austausch.';
    const text3 =
        'Sie konnten bereits Erfahrung mit VA sammeln? Dann können Sie hier Ihr Wissen in den für Sie relevanten Themengebieten vertiefen, Ihre bisherigen Erfahrungen reflektieren und sich u. a. von aktuellen Links und Artikeln für die eigene Praxis und Forschung inspirieren lassen.';

    const styleBubbleWrapper = "relative w-72 max-xl:mx-auto max-xl:my-24 xl:absolute"
    const styleBubbleMain = "group block relative h-72 w-72 z-10 rounded-full bg-ve-collab-blue flex justify-center items-center transition ease-in-out delay-150 duration-300 hover:-translate-y-1 hover:scale-110"
    const styleBubbleLeaf = "block absolute h-40 w-40 rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue hover:text-ve-collab-orange hover:border-ve-collab-orange transition ease-in-out delay-150 duration-300 hover:-translate-y-105 hover:scale-110"

    const isUserAdmin = useIsGlobalAdmin(session ? session.accessToken : '');

    const BubbleLeaf = ({style, i}: {style: string, i: number}) => {
        return (
            <Link
                href={`/learning-material/top-bubble/${props.mapping['top-bubble'][i].text}`}
                className={`${styleBubbleLeaf} ${style}`}
            >
                {props.mapping['top-bubble'][i].text}
            </Link>
        )
    }

    return (
        <>
            <Container>
                {/* page banner without the category boxes*/}
                <div className={'w-full h-96 mt-2 mb-20 relative rounded-2xl z-10'}>
                    <Image fill src={blueBackground} alt={''} />
                    <div className={'absolute top-10 bottom-10 left-20 right-20'}>
                        <h1 className={'text-6xl text-white font-bold text-center'}>{title}</h1>
                        <p className={'relative top-5 text-base text-white text-center'}> {text}</p>
                        <br />
                        <p className={'relative top-5 text-base text-white text-center'}>
                            {' '}
                            {text2}
                        </p>
                        <br />
                        <p className={'relative top-5 text-base text-white text-center'}>
                            {' '}
                            {text3}
                        </p>
                    </div>
                    {isUserAdmin && (
                        <div className="absolute top-5 right-5">
                            <Link
                                className={'bg-ve-collab-orange text-white rounded-lg px-4 py-2'}
                                href={'/learning-material/edit'}
                            >
                                Bearbeiten
                            </Link>
                        </div>
                    )}
                </div>

                {/* BUBBLES */}
                <div className="relative min-h-[135vh]">
                    {/* TOP BUBBLE */}
                    <div className={`${styleBubbleWrapper} xl:left-[40%] xl:-translate-x-[40%]`}>
                        <Link href="/learning-material/top-bubble"
                            className={`${styleBubbleMain}`}
                        >
                            <TbBulb
                                size={150}
                                className="text-white transition-colors group-hover:text-ve-collab-orange"
                            />
                        </Link>
                        {[
                            '-top-16 -left-[5rem]',
                            '-top-8 -right-[6rem]',
                            '-bottom-14 -right-[7rem]',
                            '-bottom-8 -left-[8rem]',
                        ].map((style, i) => <BubbleLeaf key={i} style={style} i={i} />)}
                    </div>

                    {/* LEFT BUBBLE */}
                    <div className={`${styleBubbleWrapper} xl:top-96 `}>
                        <Link href="/learning-material/left-bubble"
                            className={`${styleBubbleMain}`}
                        >
                            <TbClipboardList
                                size={150}
                                className="text-white transition-colors group-hover:text-ve-collab-orange"
                            />
                        </Link>
                        {[
                            '-top-16 -left-[5rem]',
                            '-bottom-14 -right-[7rem]',
                        ].map((style, i) =>  <BubbleLeaf key={i} style={style} i={i} />)}
                    </div>

                    {/* RIGHT BUBBLE */}
                    <div className={`${styleBubbleWrapper} xl:top-52 xl:right-0`}>
                        <Link href="/learning-material/right-bubble"
                            className={`${styleBubbleMain}`}
                        >
                            <FaLaptop
                                size={150}
                                className="text-white transition-colors group-hover:text-ve-collab-orange"
                            />
                        </Link>
                        {[
                            '-top-16 -left-[5rem]',
                            '-bottom-16 -right-[7rem]',
                            '-bottom-14 -left-[7rem]',
                            '-top-8 -right-[8rem]',
                        ].map((style, i) => <BubbleLeaf key={i} style={style} i={i} />)}
                    </div>

                    {/* BOTTOM BUBBLE */}
                    <div className={`${styleBubbleWrapper} xl:left-1/2 xl:-translate-x-1/2 xl:top-[35rem]`}>
                        <Link href="/learning-material/bottom-bubble"
                            className={`${styleBubbleMain}`}
                        >
                            <GiPuzzle
                                size={150}
                                className="text-white transition-colors group-hover:text-ve-collab-orange"
                            />
                        </Link>
                        {[
                            '-bottom-14 -left-[7rem]',
                            '-top-16 -right-[6rem]',
                            '-bottom-8 -right-[8rem]',
                        ].map((style, i) => <BubbleLeaf key={i} style={style} i={i} />)}
                    </div>

                </div>

            </Container>
        </>
    );
}

export async function getServerSideProps() {
    const bubbles = await getTopLevelNodes();
    const mapping: { [key: string]: INode[] } = {};

    await Promise.all(
        bubbles.map(async (bubble) => {
            const nodesInBubble = await getChildrenOfNode(bubble.id);
            mapping[bubble.text] = nodesInBubble;
        })
    );

    return {
        props: {
            mapping,
        },
    };
}
