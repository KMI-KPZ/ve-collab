import React from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function HeaderSection() {
    const { data: session } = useSession();

    return (
        <header className="bg-white px-4 lg:px-6 py-2.5 drop-shadow-lg">
            <nav className="flex flex-wrap justify-between items-center mx-auto max-w-screen-2xl">
                <Link href="/">
                    <Image src={veCollabLogo} alt="Ve Collab Logo" width={100} height={100}></Image>
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
                        <Link href="/overviewProjects">meine Pläne</Link>
                    </li>
                    <li>
                        <Link href="#">Mitteilungen</Link>
                    </li>
                </ul>
                <ul className="flex items-center font-semibold space-x-8">
                    {!session && (
                        <>
                            <li
                                onClick={() => signIn('keycloak')}
                                className="bg-ve-collab-orange text-white py-3 px-5 rounded-lg cursor-pointer"
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
