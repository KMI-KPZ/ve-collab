import React from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Notification } from '@/interfaces/socketio';

interface Props {
    notificationEvents: Notification[];
}

export default function HeaderSection({ notificationEvents }: Props) {
    const { data: session } = useSession();

    return (
        <header className="bg-white px-4 lg:px-6 py-2.5 drop-shadow-lg">
            <nav className="flex flex-wrap justify-between items-center mx-auto max-w-screen-2xl">
                <Link href="/">
                    <Image src={veCollabLogo} alt="Ve Collab Logo" width={100}></Image>
                </Link>
                <ul className="flex items-center font-semibold space-x-14">
                    <li>
                        <Link href="/">Start</Link>
                    </li>
                    <li>
                        <Link href="/content">Materialien</Link>
                    </li>
                    <li>
                        <Link href="/profile">Profil</Link>
                    </li>
                    <li>
                        <Link href="/overviewProjects">VE Designer</Link>
                    </li>
                    <li>
                        <Link href="/messages">Chat</Link>
                    </li>
                    <li className="relative">
                        <Link href="/notifications">Benachrichtigungen</Link>
                        {notificationEvents.length > 0 && (
                            <span className="absolute top-[-10px] right-[-20px] py-1 px-2 rounded-[50%] bg-red-600 text-xs">
                                {notificationEvents.length}
                            </span>
                        )}
                    </li>
                </ul>
                <ul className="flex items-center font-semibold space-x-8">
                    {!session && (
                        <>
                            <li
                                onClick={() => signIn('keycloak')}
                                className="bg-ve-collab-orange hover:bg-ve-collab-orange/70 text-white py-3 px-5 rounded-lg cursor-pointer"
                            >
                                <button onClick={() => signIn('keycloak')}>Login</button>
                            </li>
                            <li
                                onClick={() => signIn('keycloak')}
                                className="py-3 px-5 cursor-pointer"
                            >
                                <button onClick={() => signIn('keycloak')}>Registrieren</button>
                            </li>
                        </>
                    )}
                    {session && (
                        <>
                            <li>
                                <span>Eingeloggt als: {session.user?.name}</span>
                            </li>
                            <li
                                onClick={() => signOut()}
                                className="bg-ve-collab-orange text-white py-3 px-5 rounded-lg cursor-pointer"
                            >
                                <button onClick={() => signOut()}>Ausloggen</button>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
}
