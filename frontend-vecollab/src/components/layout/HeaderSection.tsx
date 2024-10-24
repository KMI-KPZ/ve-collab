import React, { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from "next/router";
import { useSession, signIn, signOut } from 'next-auth/react';
import { Notification } from '@/interfaces/socketio';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { MdArrowDropDown, MdMenu, MdOutlineMessage, MdSearch } from 'react-icons/md';
import Dropdown from '../common/Dropdown';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { useGetOwnProfile, useIsGlobalAdmin } from '@/lib/backend';
import { useTranslation } from 'next-i18next';

interface Props {
    notificationEvents: Notification[];
    headerBarMessageEvents: any[];
    toggleChatWindow: () => void;
    toggleNotifWindow: () => void;
}

export default function HeaderSection({
    notificationEvents,
    headerBarMessageEvents,
    toggleChatWindow,
    toggleNotifWindow,
}: Props) {
    const router = useRouter();
    const { data: session } = useSession();
    const { t } = useTranslation('common')

    const [messageEventCount, setMessageEventCount] = useState<number>(0);
    const currentPath = usePathname();
    const baseStyle =
        'whitespace-nowrap rounded-md border-b-2 hover:border-b-2 md:hover:border-ve-collab-orange';
    const inactiveClass = `${baseStyle} border-transparent`;
    const activeClass = `${baseStyle} border-ve-collab-orange-light`;

    const sandwichItemClass =
        'block w-full px-2 py-1 whitespace-nowrap text-left hover:bg-slate-50';
    const sandwichActiveItemClass = `${sandwichItemClass} font-bold`;

    const isGlobalAdmin = useIsGlobalAdmin(session ? session.accessToken : '');
    const {data: userProfile} = useGetOwnProfile(session ? session.accessToken : '')

    useEffect(() => {
        //filter out the messages that the user sent himself --> they should not trigger a notification icon
        const filteredMessageEvents = headerBarMessageEvents.filter((message) => {
            return message.sender !== session?.user.preferred_username;
        });
        setMessageEventCount(filteredMessageEvents.length);
    }, [headerBarMessageEvents, session]);

    const isActivePath = (path: string | string[]) =>
        Array.isArray(path)
            ? path.some((p) => currentPath?.startsWith(p))
            : currentPath?.startsWith(path);

    const isFrontpage = () => currentPath == '/';

    const changeToLanguage = router.locale === 'en' ? 'de' : 'en'

    const hideSandwichMenu = () => {
        document.dispatchEvent(new Event('mousedown'));
    };

    const handleSelectOption = async (value: string) => {
        switch (value) {
            case 'logout':
                await signOut();
                router.push('/')
                break;
            case 'profil':
                router.push('/profile');
                break;
            case 'language':
                onToggleLanguage()
                break;
            case 'contact':
                window.open('mailto:schlecht@infai.org, mihaela.markovic@uni-leipzig.de', '_blank');
                break;
            default:
                break;
        }
    };

    const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!e.currentTarget.search.value) return;
        router.push(`/search?search=${e.currentTarget.search.value}`);
    };

    const onToggleLanguage = () => {
        const { pathname, asPath, query } = router
        router.push({ pathname, query }, asPath, { locale: changeToLanguage })
    }

    const LanguageSelector = () => (
        <button
            onClick={onToggleLanguage}
            className="p-2 rounded-full hover:bg-ve-collab-blue-light"
            title={t('change_language', { language: changeToLanguage == "de" ? 'german' : 'englisch' })}
        >
            {changeToLanguage == "de" ? "EN" : "DE"}
        </button>
    )

    const Menu = () => {
        return (
            <>
                {isGlobalAdmin && (
                    <li className={isActivePath('/admin') ? activeClass : inactiveClass}>
                        <Link href="/admin" className="px-2 py-1">
                            <span className="text-red-500">Admin</span>
                        </Link>
                    </li>
                )}
                <li className={isActivePath('/learning-material') ? activeClass : inactiveClass}>
                    <Link href="/learning-material" className="px-2 py-1">
                        Materialien
                    </Link>
                </li>
                {session ? (
                    <>
                        <li className={isActivePath('/group') ? activeClass : inactiveClass}>
                            <Link href="/groups" className="px-2 py-1">
                                Gruppen
                            </Link>
                        </li>
                        <li
                            className={
                                isActivePath(['/plans', '/ve-designer'])
                                    ? activeClass
                                    : inactiveClass
                            }
                        >
                            <Link href="/plans" className="px-2 py-1">
                                <span className="text-ve-collab-orange">VE</span>{' '}
                                <span className="text-ve-collab-blue">Designer</span>
                            </Link>
                        </li>
                        <li>
                            <button
                                className="relative p-2 rounded-full hover:bg-ve-collab-blue-light "
                                onClick={(e) => toggleChatWindow()}
                                title="Chat Fenster öffnen"
                            >
                                <MdOutlineMessage size={20} />
                            </button>
                            {messageEventCount > 0 && (
                                <span className="absolute -ml-4 -mt-2 px-2 py-1 rounded-full bg-blue-500/75 text-xs font-semibold">
                                    {messageEventCount}
                                </span>
                            )}
                        </li>
                        <li>
                            <button
                                className="p-2 rounded-full hover:bg-ve-collab-blue-light"
                                onClick={(e) => toggleNotifWindow()}
                                title="Notifications Fenster öffnen"
                            >
                                <IoMdNotificationsOutline size={20} />
                            </button>
                            {notificationEvents.length > 0 && (
                                <span className="absolute -ml-4 -mt-2 py-1 px-2 rounded-[50%] bg-blue-500/75 text-xs font-semibold">
                                    {notificationEvents.length}
                                </span>
                            )}
                        </li>
                        <li className="lg:hidden">
                            <Link href={'/search'}>
                                <MdSearch size={20} />
                            </Link>
                        </li>
                        <li>
                            <LanguageSelector />
                        </li>
                        <li>
                            <div className="flex items-center font-normal">
                                <Dropdown
                                    options={[
                                        {
                                            value: 'profil',
                                            label: 'mein Profil',
                                            title: 'Eigenes Profil öffnen',
                                        },
                                        // Object.assign({}, isGlobalAdmin
                                        //     ? {
                                        //         value: "admin",
                                        //         label: "Admin Dashboard"
                                        //     } : null
                                        // ),
                                        {
                                            value: 'contact',
                                            label: 'Kontakt per Mail...',
                                            title: 'Kontaktiere uns per Mail ...',
                                        },
                                        {
                                            value: 'logout',
                                            label: 'Abmelden'
                                        },
                                    ].filter(a => "value" in a)}
                                    icon={
                                        <div className="flex items-center">
                                            <AuthenticatedImage
                                                imageId={
                                                    userProfile
                                                        ? userProfile?.profile?.profile_pic
                                                        : 'default_profile_pic.jpg'
                                                }
                                                alt={'Benutzerbild'}
                                                width={30}
                                                height={30}
                                                className="rounded-full mr-3"
                                            ></AuthenticatedImage>
                                            <div
                                                title={`${userProfile?.profile?.first_name} ${userProfile?.profile?.last_name}`}
                                                className="max-w-[96px] truncate font-semibold"
                                            >
                                                {userProfile?.profile?.first_name} {userProfile?.profile?.last_name}
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
                ) : (
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
                        <li>
                            <LanguageSelector />
                        </li>
                    </>
                )}
            </>
        );
    };

    const MenuMobile = () => {
        return (
            <>
                <li>
                    <Link
                        href="/learning-material"
                        className={
                            isActivePath('/learning-material')
                                ? sandwichActiveItemClass
                                : sandwichItemClass
                        }
                    >
                        Materialien
                    </Link>
                </li>
                {session ? (
                    <>
                        <li>
                            <Link
                                href="/groups"
                                className={
                                    isActivePath('/group')
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                Gruppen
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/plans"
                                className={
                                    isActivePath(['/plans', '/ve-designer'])
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                <span className="text-ve-collab-orange">VE</span>{' '}
                                <span className="text-ve-collab-blue">Designer</span>
                            </Link>
                        </li>
                        <li className={`relative`}>
                            <button
                                className={sandwichItemClass}
                                onClick={(e) => toggleChatWindow()}
                            >
                                Chat
                            </button>
                            {messageEventCount > 0 && (
                                <span className="absolute top-0 right-0 px-2 py-1 rounded-full bg-blue-500/75 text-xs font-semibold">
                                    {messageEventCount}
                                </span>
                            )}
                        </li>
                        <li className={`relative`}>
                            <button
                                className={sandwichItemClass}
                                onClick={(e) => toggleNotifWindow()}
                            >
                                Benachrichtigungen
                            </button>
                            {notificationEvents.length > 0 && (
                                <span className="absolute top-0 right-0 py-1 px-2 rounded-[50%] bg-blue-500/75 font-semibold">
                                    {notificationEvents.length}
                                </span>
                            )}
                        </li>

                        <li>
                            <Link
                                href={'/search'}
                                className={
                                    isActivePath('/search')
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                Suche
                            </Link>
                        </li>
                        {isGlobalAdmin && (
                            <li>
                                <Link
                                    href="/admin"
                                    className={
                                        isActivePath('/admin')
                                            ? sandwichActiveItemClass
                                            : sandwichItemClass
                                    }
                                >
                                    <span className="text-red-500">Admin Dashboard</span>
                                </Link>
                            </li>
                        )}
                        <li>
                            <hr className="m-2 " />
                        </li>

                        <li>
                            <Link
                                href={'/profile'}
                                className={
                                    isActivePath(['/profile', '/profile/edit'])
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                Profil
                            </Link>
                        </li>
                        <li>
                            <button
                                onClick={() =>
                                    window.open(
                                        'mailto:schlecht@infai.org, mihaela.markovic@uni-leipzig.de',
                                        '_blank'
                                    )
                                }
                                className={sandwichItemClass}
                            >
                                Kontakt
                            </button>
                        </li>
                        <li>
                            <button
                                className={sandwichItemClass}
                                onClick={onToggleLanguage}
                                title={t('change_language', { language: changeToLanguage == "de" ? 'german' : 'englisch' })}
                            >
                                {t('language')}:&nbsp;
                                <span className={`${changeToLanguage == 'en' ? "underline" : ""}`}>DE</span>&nbsp;|&nbsp;
                                <span className={`${changeToLanguage == 'de' ? "underline" : ""}`}>EN</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => signOut()} className={sandwichItemClass}>
                                Abmelden
                            </button>
                        </li>
                    </>
                ) : (
                    <>
                        <li>
                            <button
                                onClick={() => signIn('keycloak')}
                                className={sandwichItemClass}
                            >
                                Login
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => signIn('keycloak')}
                                className={sandwichItemClass}
                            >
                                Registrieren
                            </button>
                        </li>
                        <li>
                            <hr className="mb-2 " />
                        </li>
                        <li>
                            <button
                                className={sandwichItemClass}
                                onClick={onToggleLanguage}
                                title={t('change_language', { language: changeToLanguage == "de" ? 'german' : 'englisch' })}
                            >
                                {t('language')}:&nbsp;
                                <span className={`${changeToLanguage == 'en' ? "underline" : ""}`}>DE</span>&nbsp;|&nbsp;
                                <span className={`${changeToLanguage == 'de' ? "underline" : ""}`}>EN</span>
                            </button>
                        </li>
                        <li>
                            <Link href={'/search'} className={`px-2 py-1`}>
                                Suche
                            </Link>
                        </li>
                    </>
                )}
            </>
        );
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
                    {!router.query.search && (
                        <form
                            className="mx-4 md:mx-1 xl:mx-10 items-stretch hidden lg:flex"
                            onSubmit={(e) => handleSearchSubmit(e)}
                        >
                            <input
                                className={
                                    'w-3/4 xl:w-full border border-[#cccccc] rounded-l px-2 py-1'
                                }
                                type="text"
                                placeholder="Suchen ..."
                                name="search"
                                autoComplete="off"
                                defaultValue={router.query.search ? router.query.search as string : ''}
                            />
                            <button
                                type="submit"
                                title="Suchen"
                                className="-ml-1 bg-ve-collab-orange rounded-r p-2 hover:bg-ve-collab-orange-light"
                            >
                                <MdSearch className="text-white" />
                            </button>
                        </form>
                    )}
                </div>

                <ul className="md:hidden flex flex-1 items-center justify-end">
                    {/* TODO may put most important items here?!?
                    <li>
                        <Link href={'/search'} className={`px-2 py-1`}><MdSearch size={20} /></Link>
                    </li> */}
                    <li>
                        <Dropdown
                            options={[
                                <div onClick={() => hideSandwichMenu()} key={0}>
                                    <MenuMobile />
                                </div>,
                            ]}
                            icon={<MdMenu size={25} />}
                            ulClasses="min-w-[15rem]"
                        />
                    </li>
                </ul>

                <ul className="hidden md:flex flex-1 justify-center md:justify-end items-center font-semibold space-x-0 xl:space-x-6">
                    <Menu />
                </ul>
            </nav>
        </header>
    );
}
