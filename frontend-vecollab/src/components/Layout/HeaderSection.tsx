import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Notification } from '@/interfaces/socketio';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { MdArrowDropDown, MdOutlineMessage, MdSearch } from 'react-icons/md';
import Dropdown from '../Dropdown';
import AuthenticatedImage from '../AuthenticatedImage';
import { fetchPOST, useIsGlobalAdmin } from '@/lib/backend';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';

interface Props {
    notificationEvents: Notification[];
    headerBarMessageEvents: any[];
    toggleChatWindow: () => void;
}

export default function HeaderSection({
    notificationEvents,
    headerBarMessageEvents,
    toggleChatWindow,
}: Props) {
    const { data: session } = useSession();
    const [messageEventCount, setMessageEventCount] = useState<number>(0);
    const currentPath = usePathname();
    const inactiveClass =
        'rounded-md border-b-2 border-transparent hover:border-b-2 hover:border-ve-collab-orange';
    const activeClass =
        'rounded-md border-b-2 border-ve-collab-orange-light hover:border-b-2 hover:border-ve-collab-orange';
    const router = useRouter();

    const isGlobalAdmin = useIsGlobalAdmin(session ? session.accessToken : "");

    const [userProfileSnippet, setUserProfileSnippet] = useState<BackendUserSnippet>();

    useEffect(() => {
        if (!session?.user) return;

        fetchPOST(
            '/profile_snippets',
            { usernames: [session.user.preferred_username] },
            session.accessToken
        ).then((data) => {
            setUserProfileSnippet(data.user_snippets[0]);
        });
    }, [session]);

    useEffect(() => {
        //filter out the messages that the user sent himself --> they should not trigger a notification icon
        const filteredMessageEvents = headerBarMessageEvents.filter((message) => {
            return message.sender !== session?.user.preferred_username;
        });
        setMessageEventCount(filteredMessageEvents.length);
    }, [headerBarMessageEvents, session]);

    const isActivePath = (path: string) => {
        return currentPath?.startsWith(path);
    };

    const isFrontpage = () => currentPath == '/';

    const handleSelectOption = (value: string) => {
        switch (value) {
            case 'logout':
                signOut();
                break;
            case 'profil':
                router.push('/profile');
                break;
            case 'contact':
                window.open('mailto:schlecht@infai.org, mihaela.markovic@uni-leipzig.de', '_blank');
                break;
            default:
                break;
        }
    };

    return (
        <header className="bg-white px-4 py-2.5 drop-shadow-lg relative z-40">
            <nav className="flex flex-wrap items-center mx-auto max-w-screen-2xl">
                <div className="flex items-center ">
                    <Link href="/">
                        <Image
                            src={veCollabLogo}
                            alt="Ve Collab Logo"
                            width={100}
                            className="duration-300 hover:scale-110"
                        ></Image>
                    </Link>
                    <form className="mx-10 flex items-stretch">
                        <input
                            className={'border border-[#cccccc] rounded-l px-2 py-1'}
                            type="text"
                            placeholder={'Suchen ...'}
                            name="search"
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            title="Suchen"
                            className="-ml-1 bg-ve-collab-orange rounded-r p-2 hover:bg-ve-collab-orange-light"
                        >
                            <MdSearch className="text-white" />
                        </button>
                    </form>
                    {isGlobalAdmin && (
                        <div
                            className={
                                isActivePath('/admin') ? activeClass : inactiveClass
                            }
                        >
                            <Link
                                href="/admin"
                                className="inline-block px-2 py-1 text-red-500"
                            >
                                Admin Dashboard
                            </Link>
                        </div>
                    )}
                </div>
                <ul className="flex flex-1 justify-center xl:justify-end items-center font-semibold space-x-2 xl:space-x-6">
                    <li className={isFrontpage() ? activeClass : inactiveClass}>
                        <Link href="/" className="inline-block	px-2 py-1">
                            Start
                        </Link>
                    </li>
                    <li className={isActivePath('/content') ? activeClass : inactiveClass}>
                        <Link href="/content" className="inline-block	px-2 py-1">
                            Materialien
                        </Link>
                    </li>
                    {session && (
                        <>
                            <li className={isActivePath('/space') ? activeClass : inactiveClass}>
                                <Link href="/spaces" className="px-2 py-1">
                                    Gruppen
                                </Link>
                            </li>
                            <li
                                className={
                                    isActivePath('/overviewProjects') ? activeClass : inactiveClass
                                }
                            >
                                <Link href="/overviewProjects" className="px-2 py-1">
                                    VE Designer
                                </Link>
                            </li>
                            <li className={`!ml-2 relative`}>
                                <button
                                    className="relative p-2 rounded-full hover:bg-ve-collab-blue-light"
                                    onClick={(e) => toggleChatWindow()}
                                >
                                    <MdOutlineMessage size={20} />
                                </button>
                                {messageEventCount > 0 && (
                                    <span className="absolute -ml-4 -mt-2 px-2 py-1 rounded-full bg-blue-500/75 text-xs font-semibold">
                                        {messageEventCount}
                                    </span>
                                )}
                            </li>
                            {/* TODO this may also will be a popup window */}
                            <li className={`!ml-2 relative`}>
                                <button
                                    className="p-2 rounded-full hover:bg-ve-collab-blue-light"
                                    onClick={(e) => router.push('/notifications')}
                                >
                                    <IoMdNotificationsOutline size={20} />
                                </button>
                                {notificationEvents.length > 0 && (
                                    <span className="absolute -ml-4 -mt-2 py-1 px-2 rounded-[50%] bg-blue-400/75 text-xs">
                                        {notificationEvents.length}
                                    </span>
                                )}
                            </li>
                            <li className="!ml-2">
                                <div className="flex items-center font-normal">
                                    <Dropdown
                                        options={[
                                            {
                                                value: 'profil',
                                                label: 'Profil',
                                                title: 'Profil bearbeiten',
                                            },
                                            {
                                                value: 'contact',
                                                label: 'Kontakt',
                                                title: 'Kontakt per Mail ...',
                                            },
                                            { value: 'logout', label: 'Abmelden' },
                                        ]}
                                        icon={
                                            <div className="flex items-center">
                                                <AuthenticatedImage
                                                    imageId={
                                                        userProfileSnippet
                                                            ? userProfileSnippet.profile_pic
                                                            : 'default_profile_pic.jpg'
                                                    }
                                                    alt={'Benutzerbild'}
                                                    width={30}
                                                    height={30}
                                                    className="rounded-full mr-3"
                                                ></AuthenticatedImage>
                                                <div
                                                    title="{session.user?.name}"
                                                    className="max-w-24 truncate font-semibold"
                                                >
                                                    {session.user?.name}
                                                </div>
                                                <MdArrowDropDown />
                                            </div>
                                        }
                                        ulClasses="min-w-[10rem]"
                                        onSelect={handleSelectOption}
                                    />
                                </div>
                            </li>
                        </>
                    )}
                    {!session && (
                        <>
                            <li>
                                <button
                                    onClick={() => signIn('keycloak')}
                                    className={`${inactiveClass} px-2 py-1`}
                                >
                                    Login
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => signIn('keycloak')}
                                    className={`${inactiveClass} px-2 py-1`}
                                >
                                    Registrieren
                                </button>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
}
