import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react';
import { Notification } from '@/interfaces/socketio';

interface Props {
    notificationEvents: Notification[];
    headerBarMessageEvents: any[];
}

export default function HeaderSection({ notificationEvents, headerBarMessageEvents }: Props) {
    const { data: session } = useSession();
    const [messageEventCount, setMessageEventCount] = useState<number>(0);
    const currentPath = usePathname()
    const inactiveClass = 'hover:ring hover:ring-ve-collab-orange rounded-lg'
    const activeClass = "hover:ring hover:ring-ve-collab-orange rounded-lg bg-ve-collab-orange-light"

    useEffect(() => {
        //filter out the messages that the user sent himself --> they should not trigger a notification icon
        const filteredMessageEvents = headerBarMessageEvents.filter((message) => {
            return message.sender !== session?.user.preferred_username;
        });
        setMessageEventCount(filteredMessageEvents.length);
    }, [headerBarMessageEvents, session]);

    const isActivePath = (path: string) => {
        return currentPath.startsWith(path)
    }

    const isFrontpage = () => currentPath == '/'

    return (
        <header className="bg-white px-4 lg:px-6 py-2.5 drop-shadow-lg">
            <nav className="flex flex-wrap justify-between items-center mx-auto max-w-screen-2xl">
                <Link href="/">
                    <Image
                        src={veCollabLogo}
                        alt="Ve Collab Logo"
                        width={100}
                        className="duration-300 hover:scale-110"
                    ></Image>
                </Link>
                <ul className="flex items-center font-semibold space-x-14">
                    <li className={isFrontpage() ? activeClass : inactiveClass}>
                        <Link href="/" className='inline-block	px-2 py-3'>Start</Link>
                    </li>
                    <li className={isActivePath('/content') ? activeClass : inactiveClass}>
                        <Link href="/content" className='inline-block	px-2 py-3'>Materialien</Link>
                    </li>
                    <li className={isActivePath('/editProfile') ? activeClass : inactiveClass}>
                        <Link href="/profile" className='inline-block	px-2 py-3'>Profil</Link>
                    </li>
                    <li className={isActivePath('/space') ? activeClass : inactiveClass}>
                        <Link href="/spaces" className='inline-block	px-2 py-3'>Gruppen</Link>
                    </li>
                    <li className={isActivePath('/overviewProjects') ? activeClass : inactiveClass}>
                        <Link href="/overviewProjects" className='inline-block	px-2 py-3'>VE Designer</Link>
                    </li>
                    <li className={isActivePath('/messages') ? `relative ${activeClass}` : `relative ${inactiveClass}`}>
                        <Link href="/messages" className='inline-block	px-2 py-3'>Chat</Link>
                        {messageEventCount > 0 && (
                            <span className="absolute top-[-10px] right-[-20px] py-1 px-2 rounded-[50%] bg-red-600 text-xs">
                                {messageEventCount}
                            </span>
                        )}
                    </li>
                    <li className={isActivePath('/notifications') ? `relative ${activeClass}` : `relative ${inactiveClass}`}>
                        <Link href="/notifications" className='inline-block	px-2 py-3'>Benachrichtigungen</Link>
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
