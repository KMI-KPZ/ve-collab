import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import CategoryBox from './category-box';
import { ITopLevelNode } from '@/interfaces/material/materialInterfaces';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { fetchGET } from '@/lib/backend';
import Link from 'next/link';

interface Props {
    topLevelNodes: ITopLevelNode[];
}

export default function PageBanner({ topLevelNodes }: Props) {
    const { data: session, status } = useSession();

    const [isUserAdmin, setIsUserAdmin] = useState(false);

    const title = 'SELBSTLERNMATERIALIEN';
    const text =
        'Herzlich Willkommen zum stetig wachsenden Qualifizierungsangebot von VE-Collab!';
    const text2 = 'Sie interessieren sich für virtuelle Austausche, haben aber noch kein oder wenig Vorwissen zum Thema? Dann helfen Ihnen die Materialien dabei, ins Thema einzutauchen und unterstützen Sie Schritt für Schritt auf dem Weg hin zu Ihrem ersten eigenen virtuellen Austausch.'
    const text3 = 'Sie konnten bereits Erfahrung mit VA sammeln? Dann können Sie hier Ihr Wissen in den für Sie relevanten Themengebieten vertiefen, Ihre bisherigen Erfahrungen reflektieren und sich u. a. von aktuellen Links und Artikeln für die eigene Praxis und Forschung inspirieren lassen.'

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
            <div className={'w-full h-96 mt-2 relative rounded-2xl z-10'}>
                <Image fill src={blueBackground} alt={''} />
                <div className={'absolute top-10 bottom-10 left-20 right-20'}>
                    <h1 className={'text-6xl text-white font-bold text-center'}>{title}</h1>
                    <p className={'relative top-5 text-base text-white'}> {text}</p>
                    <br/>
                    <p className={'relative top-5 text-base text-white'}> {text2}</p>
                    <br/>
                    <p className={'relative top-5 text-base text-white'}> {text3}</p>

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
            <ul className={'w-full flex relative -mt-10 justify-center z-20'}>
                {topLevelNodes.map((node) => (
                    <CategoryBox key={node.id} slug={node.text} categoryName={node.text} />
                ))}
            </ul>
        </>
    );
}
