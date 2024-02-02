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

    const title = 'Materialien zu VE';
    const text =
        'Hello and welcome to our ve-collab qualification offer! This section is centrally filled with lerning opportunities and can be extended by our community. The learning resources you will find here are sorted across the disciplines as well as discipline-specific. Here you can get an overview of VEs and learn more about the individual topics. ';

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
                <div className={'absolute top-10 bottom-10 left-20 right-20 text-center'}>
                    <h1 className={'text-7xl text-white font-bold'}>{title}</h1>
                    <p className={'relative top-5 text-base text-white'}> {text}</p>
                </div>
                {isUserAdmin && (
                    <div className="absolute top-5 right-5">
                        <Link
                            className={'bg-ve-collab-orange text-white rounded-lg px-4 py-2'}
                            href={'/content/edit'}
                        >
                            Bearbeiten
                        </Link>
                    </div>
                )}
            </div>
            <ul className={'w-full flex relative -mt-14 justify-center z-20'}>
                {topLevelNodes.map((node) => (
                    <CategoryBox key={node.id} slug={node.text} categoryName={node.text} />
                ))}
            </ul>
        </>
    );
}
