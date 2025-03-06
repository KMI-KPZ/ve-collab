import React, { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import veCollabLogo from '@/images/veCollabLogo.png';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Notification } from '@/interfaces/socketio';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { MdArrowDropDown, MdHome, MdMenu, MdOutlineMessage, MdSearch } from 'react-icons/md';
import Dropdown from '../common/Dropdown';
import { useGetOwnProfile, useIsGlobalAdmin } from '@/lib/backend';
import { useTranslation } from 'next-i18next';
import UserProfileImage from '../network/UserProfileImage';
import useDynamicPlaceholder from '../common/useDynamicPlaceholder';

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
    const { t } = useTranslation('common');

    const [messageEventCount, setMessageEventCount] = useState<number>(0);
    const currentPath = usePathname();
    const baseStyle =
        'whitespace-nowrap hover:text-ve-collab-orange hover:after:visible hover:after:w-full after:content-[""] after:block after:h-[2px] after:w-0 after:bg-ve-collab-blue after:invisible after:transition-all	';
    const inactiveClass = `${baseStyle}`;
    const activeClass = `${baseStyle} font-semibold`;

    const sandwichItemClass =
        'block w-full px-2 py-1 whitespace-nowrap text-left hover:bg-slate-50';
    const sandwichActiveItemClass = `${sandwichItemClass} font-bold`;

    const isGlobalAdmin = useIsGlobalAdmin(session ? session.accessToken : '');
    const { data: userProfile } = useGetOwnProfile(session ? session.accessToken : '');

    const searchInputRef = useRef<HTMLInputElement>(null);
    useDynamicPlaceholder(searchInputRef);

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

    const changeToLanguage = router.locale === 'en' ? 'de' : 'en';

    const hideSandwichMenu = () => {
        document.dispatchEvent(new Event('mousedown'));
    };

    const handleSelectOption = async (value: string) => {
        switch (value) {
            case 'logout':
                await signOut({ callbackUrl: '/' });
                router.push('/');
                break;
            case 'profile':
                router.push('/profile');
                break;
            case 'edit_profile':
                router.push('/profile/edit');
                break;
            case 'language':
                onToggleLanguage();
                break;
            case 'admin':
                router.push('/admin');
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
        const { pathname, asPath, query } = router;
        router.push({ pathname, query }, asPath, { locale: changeToLanguage });
    };

    const LanguageSelector = () => (
        <button
            onClick={onToggleLanguage}
            className="p-2 rounded-full hover:bg-ve-collab-blue-light"
            title={t('change_language', {
                language: changeToLanguage == 'de' ? 'german' : 'englisch',
            })}
        >
            {changeToLanguage == 'de' ? 'EN' : 'DE'}
        </button>
    );

    const Menu = () => {
        return (
            <>
                {session ? (
                    <>
                        <li className={isActivePath('/home') ? activeClass : inactiveClass}>
                            <Link href="/home" className="py-1">
                                {t('home')}
                            </Link>
                        </li>
                        <li
                            className={
                                isActivePath('/learning-material') ? activeClass : inactiveClass
                            }
                        >
                            <Link href="/learning-material" className="py-1">
                                {t('materials')}
                            </Link>
                        </li>
                        <li className={isActivePath('/group') ? activeClass : inactiveClass}>
                            <Link href="/groups" className="py-1">
                                {t('groups')}
                            </Link>
                        </li>
                        <li
                            className={
                                isActivePath(['/plans', '/ve-designer'])
                                    ? activeClass
                                    : inactiveClass
                            }
                        >
                            <Link href="/plans" className="py-1">
                                <span className="text-ve-collab-orange">VE</span>{' '}
                                <span className="text-ve-collab-blue">Designer</span>
                            </Link>
                        </li>
                        <li>
                            <button
                                className="relative p-2 rounded-full hover:bg-ve-collab-blue-light "
                                onClick={(e) => toggleChatWindow()}
                                title={t('toggle_chat_window')}
                            >
                                <MdOutlineMessage size={20} />
                            </button>
                            {messageEventCount > 0 && (
                                <span className="absolute -ml-4 -mt-2 px-2 py-1 rounded-full bg-blue-500/75 text-xs">
                                    {messageEventCount}
                                </span>
                            )}
                        </li>
                        <li>
                            <button
                                className="p-2 rounded-full hover:bg-ve-collab-blue-light"
                                onClick={(e) => toggleNotifWindow()}
                                title={t('notifications.toggle_notification_window')}
                            >
                                <IoMdNotificationsOutline size={20} />
                            </button>
                            {notificationEvents.length > 0 && (
                                <span className="absolute -ml-4 -mt-2 py-1 px-2 rounded-[50%] bg-blue-500/75 text-xs">
                                    {notificationEvents.length}
                                </span>
                            )}
                        </li>
                        <li className="lg:hidden p-2 rounded-full hover:bg-ve-collab-blue-light">
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
                                        Object.assign(
                                            {},
                                            isGlobalAdmin
                                                ? {
                                                      value: 'admin',
                                                      label: 'Admin Dashboard',
                                                      liClasses: 'text-red-600 border-b',
                                                  }
                                                : null
                                        ),
                                        {
                                            value: 'profile',
                                            label: t('profile'),
                                            title: t('profile_title'),
                                        },
                                        {
                                            value: 'edit_profile',
                                            label: t('edit_profile'),
                                            title: t('edit_profile_title'),
                                        },
                                        {
                                            value: 'logout',
                                            label: t('logout'),
                                        },
                                    ].filter((a) => 'value' in a)}
                                    icon={
                                        <div className="flex items-center">
                                            <span className="shrink-0">
                                                <UserProfileImage
                                                    profile_pic={userProfile?.profile?.profile_pic}
                                                    chosen_achievement={
                                                        userProfile?.profile?.chosen_achievement
                                                    }
                                                />
                                            </span>
                                            <div
                                                title={`${userProfile?.profile?.first_name} ${userProfile?.profile?.last_name}`}
                                                className="max-w-[96px] truncate"
                                            >
                                                {userProfile?.profile?.first_name}{' '}
                                                {userProfile?.profile?.last_name}
                                            </div>
                                            <MdArrowDropDown className="shrink-0" />
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
                        <li
                            className={
                                isActivePath('/learning-material') ? activeClass : inactiveClass
                            }
                        >
                            <Link href="/learning-material" className="py-1">
                                {t('materials')}
                            </Link>
                        </li>
                        <li>
                            <button
                                onClick={() => signIn('keycloak', { callbackUrl: '/home' })}
                                className={`${inactiveClass} py-1`}
                            >
                                {t('login')}
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => signIn('keycloak', { callbackUrl: '/home' })}
                                className={`${inactiveClass} px-2 py-1`}
                            >
                                {t('register')}
                            </button>
                        </li>
                        <li className="lg:hidden px-2">
                            <Link href={'/search'}>
                                <MdSearch size={20} />
                            </Link>
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
                {session && (
                    <>
                        <li>
                            <Link
                                href="/home"
                                className={`block p-2 rounded-full hover:bg-ve-collab-blue-light ${
                                    isActivePath('/home') ? 'bg-gray-100' : ''
                                }`}
                            >
                                <MdHome size={19} />
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
                                <span className="absolute -ml-4 -mt-2 px-2 py-1 rounded-full bg-blue-500/75 text-xs">
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
                                <span className="absolute -ml-4 -mt-2 py-1 px-2 rounded-[50%] bg-blue-500/75 text-xs">
                                    {notificationEvents.length}
                                </span>
                            )}
                        </li>
                    </>
                )}
                {session && (
                    <li>
                        <Link href={'/profile'} className="ml-3 -mr-3">
                            <UserProfileImage
                                profile_pic={userProfile?.profile?.profile_pic}
                                chosen_achievement={userProfile?.profile?.chosen_achievement}
                                width={30}
                                height={30}
                            />
                        </Link>
                    </li>
                )}
                <li>
                    <Dropdown
                        options={[
                            <div onClick={() => hideSandwichMenu()} key={0}>
                                <SandwichMenuMobile />
                            </div>,
                        ]}
                        icon={<MdMenu size={25} />}
                        ulClasses="min-w-[15rem]"
                    />
                </li>
            </>
        );
    };

    const SandwichMenuMobile = () => {
        return (
            <>
                {session ? (
                    <>
                        <li>
                            <Link
                                href="/home"
                                className={
                                    isActivePath('/home')
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                {t('home')}
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/learning-material"
                                className={
                                    isActivePath('/learning-material')
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                {t('materials')}
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/groups"
                                className={
                                    isActivePath('/group')
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                {t('groups')}
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
                        {/* <li className={`relative`}>
                            <button
                                className={sandwichItemClass}
                                onClick={(e) => toggleChatWindow()}
                            >
                                {t('chat')}
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
                                {t('notifications')}
                            </button>
                            {notificationEvents.length > 0 && (
                                <span className="absolute top-0 right-0 py-1 px-2 rounded-[50%] bg-blue-500/75 font-semibold">
                                    {notificationEvents.length}
                                </span>
                            )}
                        </li> */}

                        <li>
                            <Link
                                href={'/search'}
                                className={
                                    isActivePath('/search')
                                        ? sandwichActiveItemClass
                                        : sandwichItemClass
                                }
                            >
                                {t('search')}
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
                                {t('profile')}
                            </Link>
                        </li>
                        <li>
                            <button
                                className={sandwichItemClass}
                                onClick={onToggleLanguage}
                                title={t('change_language', {
                                    language: changeToLanguage == 'de' ? 'german' : 'englisch',
                                })}
                            >
                                {t('language')}:&nbsp;
                                <span className={`${changeToLanguage == 'en' ? 'underline' : ''}`}>
                                    DE
                                </span>
                                &nbsp;|&nbsp;
                                <span className={`${changeToLanguage == 'de' ? 'underline' : ''}`}>
                                    EN
                                </span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className={sandwichItemClass}
                            >
                                {t('logout')}
                            </button>
                        </li>
                    </>
                ) : (
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
                                {t('materials')}
                            </Link>
                        </li>
                        <li>
                            <button
                                onClick={() => signIn('keycloak', { callbackUrl: '/home' })}
                                className={sandwichItemClass}
                            >
                                {t('login')}
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => signIn('keycloak', { callbackUrl: '/home' })}
                                className={sandwichItemClass}
                            >
                                {t('register')}
                            </button>
                        </li>
                        <li>
                            <hr className="mb-2 " />
                        </li>
                        <li>
                            <button
                                className={sandwichItemClass}
                                onClick={onToggleLanguage}
                                title={t('change_language', {
                                    language: changeToLanguage == 'de' ? 'german' : 'englisch',
                                })}
                            >
                                {t('language')}:&nbsp;
                                <span className={`${changeToLanguage == 'en' ? 'underline' : ''}`}>
                                    DE
                                </span>
                                &nbsp;|&nbsp;
                                <span className={`${changeToLanguage == 'de' ? 'underline' : ''}`}>
                                    EN
                                </span>
                            </button>
                        </li>
                        <li>
                            <Link href={'/search'} className={`${sandwichItemClass} px-2 py-1`}>
                                {t('search')}
                            </Link>
                        </li>
                    </>
                )}
            </>
        );
    };

    return (
        <header className="bg-white px-4 md:px-2 lg:px-4 py-2.5 drop-shadow-lg relative z-20">
            <nav className="flex flex-nowrap items-center mx-auto max-w-screen-2xl">
                <div className="flex items-center ">
                    <Link href="/" className="shrink-0">
                        <Image
                            src={veCollabLogo}
                            alt="Ve Collab Logo"
                            width={100}
                            className="duration-300 hover:scale-110"
                        ></Image>
                    </Link>
                    {!isActivePath('/search') && (
                        <form
                            className="mx-4 md:mx-6 xl:mx-10 items-stretch hidden lg:flex"
                            onSubmit={(e) => handleSearchSubmit(e)}
                        >
                            <input
                                className={
                                    'w-3/4 border border-[#cccccc] rounded-md px-2 py-1 focus:outline-none'
                                }
                                type="text"
                                placeholder={`${t('search')}...`}
                                data-placeholder={t('search_placeholder_caroussel')}
                                name="search"
                                autoComplete="off"
                                defaultValue={
                                    router.query.search ? (router.query.search as string) : ''
                                }
                                ref={searchInputRef}
                            />
                            <button
                                type="submit"
                                title={t('search_title')}
                                className="-ml-1 bg-ve-collab-orange rounded-r p-2 hover:bg-ve-collab-orange-light"
                            >
                                <MdSearch className="text-white" />
                            </button>
                        </form>
                    )}
                </div>

                <ul className="min-[876px]:hidden flex flex-1 items-center justify-end">
                    <MenuMobile />
                </ul>

                <ul className="hidden min-[876px]:flex flex-1 justify-end items-center space-x-3 xl:space-x-6">
                    <Menu />
                </ul>
            </nav>
        </header>
    );
}
