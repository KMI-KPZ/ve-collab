import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react';
import { Notification } from '@/interfaces/socketio';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { MdArrowDropDown, MdOutlineMessage, MdSearch } from 'react-icons/md';
import Dropdown from '../Dropdown';
import AuthenticatedImage from '../AuthenticatedImage';

interface Props {
    notificationEvents: Notification[];
    headerBarMessageEvents: any[];
}

export default function HeaderSection({ notificationEvents, headerBarMessageEvents }: Props) {
    const { data: session } = useSession();
    const [messageEventCount, setMessageEventCount] = useState<number>(0);
    const currentPath = usePathname()
    const inactiveClass = 'rounded-md border-b-2 border-transparent hover:border-b-2 hover:border-ve-collab-orange'
    const activeClass = "rounded-md border-b-2 border-ve-collab-orange-light hover:border-b-2 hover:border-ve-collab-orange"
    const router = useRouter()

    useEffect(() => {
        //filter out the messages that the user sent himself --> they should not trigger a notification icon
        const filteredMessageEvents = headerBarMessageEvents.filter((message) => {
            return message.sender !== session?.user.preferred_username;
        });
        setMessageEventCount(filteredMessageEvents.length);
    }, [headerBarMessageEvents, session]);

    const isActivePath = (path: string) => {
        return currentPath?.startsWith(path)
    }

    const isFrontpage = () => currentPath == '/'

    const handleSelectOption = (value: string) => {
        switch (value) {
            case 'logout':
                signOut()
                break;
            case 'profil':
                router.push('/profile')
                break;
            case 'contact':
                window.open('mailto:schlecht@infai.org, mihaela.markovic@uni-leipzig.de', '_blank');
                break;
            default:
                break;
        }
    }

    const userImage = session?.user.image || "default_profile_pic.jpg"

    return (
        <header className="bg-white px-4 lg:px-6 py-2.5 drop-shadow-lg relative z-20">
            <nav className="flex flex-wrap items-center mx-auto max-w-screen-2xl">
                <div className='flex items-center '>
                    <Link href="/">
                        <Image
                            src={veCollabLogo}
                            alt="Ve Collab Logo"
                            width={100}
                            className="duration-300 hover:scale-110"
                        ></Image>
                    </Link>
                    <form className='ml-10 relative'>
                        <input
                                className={'border border-[#cccccc] rounded-l px-2 py-1 h-full'}
                                type="text"
                                placeholder={'Suchen ...'}
                                name='search'
                                autoComplete="off"
                            />
                        <button type="submit" title="Suchen" className='-ml-1 bg-ve-collab-orange rounded-r p-2 absolute h-full hover:bg-ve-collab-orange-light'>
                            <MdSearch className='text-white' />
                        </button>
                    </form>
                </div>
                <ul className="flex flex-1 justify-end items-center font-semibold space-x-7">
                    <li className={isFrontpage() ? activeClass : inactiveClass}>
                        <Link href="/" className='inline-block	px-2 py-1'>Start</Link>
                    </li>
                    <li className={isActivePath('/content') ? activeClass : inactiveClass}>
                        <Link href="/content" className='inline-block	px-2 py-1'>Materialien</Link>
                    </li>
                    {session && (
                        <>
                            <li className={isActivePath('/space') ? activeClass : inactiveClass}>
                                <Link href="/spaces" className='inline-block	px-2 py-1'>Gruppen</Link>
                            </li>
                            <li className={isActivePath('/overviewProjects') ? activeClass : inactiveClass}>
                                <Link href="/overviewProjects" className='inline-block	px-2 py-1'>VE Designer</Link>
                            </li>
                            <li className={`${isActivePath('/messages') ? activeClass : inactiveClass} !ml-2`}>
                                <Link href="/messages" className='inline-block px-2 py-1'>
                                    <MdOutlineMessage />
                                </Link>
                                {messageEventCount > 0 && (
                                    <span className="absolute top-[-10px] right-[-20px] py-1 px-2 rounded-[50%] bg-blue-400/75 text-xs">
                                        {messageEventCount}
                                    </span>
                                )}
                            </li>
                            <li className={`${isActivePath('/notifications') ? activeClass : inactiveClass} !ml-2`}>
                                <Link href="/notifications" className='inline-block	px-2 py-1'>
                                    <IoMdNotificationsOutline />
                                </Link>
                                {notificationEvents.length > 0 && (
                                    <span className="absolute top-[-10px] right-[-20px] py-1 px-2 rounded-[50%] bg-blue-400/75 text-xs">
                                        {notificationEvents.length}
                                    </span>
                                )}
                            </li>
                            <li className='!ml-2'>
                                <div className='flex items-center font-normal' >
                                    <Dropdown
                                        options={[
                                            {value: 'profil', label: 'Profil', title: 'Profil bearbeiten'},
                                            {value: 'contact', label: 'Kontakt', title: 'Kontakt per Mail ...'},
                                            {value: 'logout', label: 'Abmelden'}
                                        ]}
                                        icon={
                                            <div className='flex items-center'>
                                                <AuthenticatedImage
                                                    imageId={userImage}
                                                    alt={'Benutzerbild'}
                                                    width={30}
                                                    height={30}
                                                    className="rounded-full mr-3"
                                                ></AuthenticatedImage>
                                                <div title='{session.user?.name}' className='max-w-24 truncate font-semibold'>{session.user?.name}</div>
                                                <MdArrowDropDown />
                                            </div>
                                        }
                                        onSelect={handleSelectOption}
                                    />
                                </div>
                            </li>
                        </>
                    )}
                    {!session && (
                        <>
                            <li><button onClick={() => signIn('keycloak')}>Login</button></li>
                            <li><button onClick={() => signIn('keycloak')}>Registrieren</button></li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
}
