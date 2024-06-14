import Container from '@/components/Layout/container';
import { getChildrenOfNode, getTopLevelNodes } from '@/lib/backend';
import { INode } from '@/interfaces/material/materialInterfaces';
import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { fetchGET } from '@/lib/backend';
import Link from 'next/link';
import { TbBulb, TbClipboardList } from 'react-icons/tb';
import { GiPuzzle } from 'react-icons/gi';
import { FaLaptop } from 'react-icons/fa';

interface Props {
    mapping: { [key: string]: INode[] };
}

// Landing Page: no category (and therefore no learning-material is chosen)
export default function PageCategoryNotSelected(props: Props) {
    const { data: session, status } = useSession();

    const title = 'SELBSTLERNMATERIALIEN';
    const text = 'Herzlich Willkommen zum stetig wachsenden Qualifizierungsangebot von VE-Collab!';
    const text2 =
        'Sie interessieren sich für virtuelle Austausche, haben aber noch kein oder wenig Vorwissen zum Thema? Dann helfen Ihnen die Materialien dabei, ins Thema einzutauchen und unterstützen Sie Schritt für Schritt auf dem Weg hin zu Ihrem ersten eigenen virtuellen Austausch.';
    const text3 =
        'Sie konnten bereits Erfahrung mit VA sammeln? Dann können Sie hier Ihr Wissen in den für Sie relevanten Themengebieten vertiefen, Ihre bisherigen Erfahrungen reflektieren und sich u. a. von aktuellen Links und Artikeln für die eigene Praxis und Forschung inspirieren lassen.';

    const [isUserAdmin, setIsUserAdmin] = useState(false);

    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        if (session) {
            fetchGET('/admin_check', session.accessToken).then((res) => {
                setIsUserAdmin(res.is_admin);
            });
        }
    }, [session, status]);

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
                        <p className={'relative top-5 text-base text-white text-center'}> {text2}</p>
                        <br />
                        <p className={'relative top-5 text-base text-white text-center'}> {text3}</p>
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
                {/* bubbles */}
                <div className="relative min-h-[90vh]">
                    {/* top bubble*/}
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <div className="relative">
                            <Link href={`/learning-material/top-bubble/${props.mapping['top-bubble'][0].text}`}>
                                <div className="h-36 w-36 absolute -z-10 -top-16 -left-[5rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['top-bubble'][0].text}
                                </div>
                            </Link>
                            <Link href={`/learning-material/top-bubble/${props.mapping['top-bubble'][1].text}`}>
                                <div className="h-36 w-36 absolute -z-10 -top-8 -right-[6rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['top-bubble'][1].text}
                                </div>
                            </Link>
                            <Link href={`/learning-material/top-bubble/${props.mapping['top-bubble'][2].text}`}>
                                <div className="h-40 w-40 absolute -z-10 -bottom-14 -right-[7rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['top-bubble'][2].text}
                                </div>
                            </Link>
                            <Link href={`/learning-material/top-bubble/${props.mapping['top-bubble'][3].text}`}>
                                <div className="h-36 w-36 absolute -z-10 -bottom-8 -left-[6rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['top-bubble'][3].text}
                                </div>
                            </Link>
                            <Link href="/learning-material/top-bubble">
                                <div className="h-72 w-72 rounded-full bg-ve-collab-blue flex justify-center items-center">
                                    <TbBulb
                                        size={150}
                                        className="text-white hover:text-ve-collab-orange"
                                    />
                                </div>
                            </Link>
                        </div>
                    </div>
                    {/* left bubble*/}
                    <div className="absolute left-[10%] top-2/3 -translate-y-2/3 -translate-x-[10%]">
                        <div className="relative">
                            <Link
                                href={`/learning-material/left-bubble/${props.mapping['left-bubble'][0].text}`}
                            >
                                <div className="h-40 w-40 absolute -z-10 -top-[5rem] -left-[5rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['left-bubble'][0].text}
                                </div>
                            </Link>
                            
                            <Link
                                href={`/learning-material/left-bubble/${props.mapping['left-bubble'][1].text}`}
                            >
                                <div className="h-40 w-40 absolute -z-10 -bottom-6 -right-[8rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['left-bubble'][1].text}
                                </div>
                            </Link>
                            
                            <Link href="/learning-material/left-bubble">
                                <div className="h-72 w-72 rounded-full bg-ve-collab-blue flex justify-center items-center">
                                    <TbClipboardList
                                        size={150}
                                        className="text-white hover:text-ve-collab-orange"
                                    />
                                </div>
                            </Link>
                        </div>
                    </div>
                    {/* bottom bubble*/}
                    <div className="absolute left-[55%] top-[90%] -translate-y-[90%] -translate-x-[55%]">
                        <div className="relative">
                            <Link
                                href={`/learning-material/bottom-bubble/${props.mapping['bottom-bubble'][0].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 bottom-4 -left-[8rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['bottom-bubble'][0].text}
                                </div>
                            </Link>
                            <Link
                                href={`/learning-material/bottom-bubble/${props.mapping['bottom-bubble'][1].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 -top-[5rem] -right-[2rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['bottom-bubble'][1].text}
                                </div>
                            </Link>
                            <Link
                                href={`/learning-material/bottom-bubble/${props.mapping['bottom-bubble'][2].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 -bottom-6 -right-[6rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['bottom-bubble'][2].text}
                                </div>
                            </Link>
                            <Link href="/learning-material/bottom-bubble">
                                <div className="h-72 w-72 rounded-full bg-ve-collab-blue flex justify-center items-center">
                                    <GiPuzzle
                                        size={150}
                                        className="text-white hover:text-ve-collab-orange"
                                    />
                                </div>
                            </Link>
                        </div>
                    </div>
                    {/* right bubble*/}
                    <div className="absolute left-[90%] top-1/3 -translate-y-1/3 -translate-x-[90%]">
                        <div className="relative">
                            <Link
                                href={`/learning-material/right-bubble/${props.mapping['right-bubble'][0].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 -top-[5rem] -left-[4rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['right-bubble'][0].text}
                                </div>
                            </Link>
                            <Link
                                href={`/learning-material/right-bubble/${props.mapping['right-bubble'][1].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 -bottom-[6rem] -right-[2rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['right-bubble'][1].text}
                                </div>
                            </Link>
                            <Link
                                href={`/learning-material/right-bubble/${props.mapping['right-bubble'][2].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 -bottom-[4rem] -left-[4rem] rounded-full bg-white border border-ve-collab-blue flex items-center justify-center text-center text-ve-collab-blue cursor-pointer hover:text-ve-collab-orange hover:border-ve-collab-orange">
                                    {props.mapping['right-bubble'][2].text}
                                </div>
                            </Link>
                            <Link
                                href={`/learning-material/right-bubble/${props.mapping['right-bubble'][3].text}`}
                            >
                                <div className="h-36 w-36 absolute -z-10 -top-[3rem] -right-[5rem] rounded-full bg-white border border-ve-collab-orange flex items-center justify-center text-center text-ve-collab-orange cursor-pointer hover:text-ve-collab-orange-light hover:border-ve-collab-orange-light">
                                    {props.mapping['right-bubble'][3].text}
                                </div>
                            </Link>
                            
                            <Link href="/learning-material/right-bubble">
                            <div className="h-72 w-72 rounded-full bg-ve-collab-blue flex justify-center items-center">
                                <FaLaptop size={150} className='text-white hover:text-ve-collab-orange' />
                            </div>
                            </Link>
                        </div>
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
