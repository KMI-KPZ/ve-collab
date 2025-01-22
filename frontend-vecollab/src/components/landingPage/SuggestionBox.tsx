import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MdArrowRight } from 'react-icons/md';
import H2 from '../common/H2';
import { fetchGET, fetchTaxonomy } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { getClusterRouteBySlug } from '@/pages/learning-material';
import LocalStorage from '@/lib/storage';
import UserProfileImage from '../network/UserProfileImage';

interface ISuggestedLection {
    id: number;
    text: string;
    path: string;
}

const ttl = 24 * 60 * 60 * 1000;

SuggestionBox.auth = true;
export default function SuggestionBox() {
    const { t } = useTranslation(['community', 'common']);
    const { data: session } = useSession();

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
            <div className="w-full m-6 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg">
                <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
                <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>
                {children}
            </div>
        );
    };

    const SuggestedLections = () => {
        const [lections, setLections] = useState<ISuggestedLection[]>([]);

        const getSuggestedLection = async () => {
            let allLections: ISuggestedLection[] = [];
            const taxonomy = await fetchTaxonomy();

            taxonomy.map((lection) => {
                if (!Object.hasOwn(lection, 'data')) return;

                const node = taxonomy.find((a) => a.id == lection.parent);
                const cluster = taxonomy.find((a) => a.id == node!.parent);
                allLections.push({
                    id: lection.id,
                    text: lection.text,
                    path: `/learning-material/${getClusterRouteBySlug(cluster?.text!)}/${
                        node?.text
                    }/${lection.text}`,
                });
            });

            const randomLections = allLections.sort(() => 0.5 - Math.random());
            return randomLections.slice(0, 5);
        };

        useEffect(() => {
            if (lections.length) return;
            const storedLections = LocalStorage.getItem('suggested_lections');
            if (storedLections) {
                setLections(storedLections);
                return;
            }
            getSuggestedLection()
                .then((lections) => {
                    setLections(lections);
                    LocalStorage.addItem('suggested_lections', lections, ttl);
                })
                .catch(console.error);
        }, [lections]);

        if (!lections.length) return <></>;

        return (
            <Wrapper>
                <H2>{t('suggested_materials')}</H2>

                <ul className="*:px-4 *:py-2 *:my-3 *:text-ve-collab-blue">
                    {lections.map((lection, index) => {
                        return (
                            <li
                                key={index}
                                className="hover:text-ve-collab-orange transition ease-in-out"
                            >
                                <Link href={`${lection.path}`}>{lection.text}</Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="px-4 py-2 mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                    <Link href={`/learning-material`} onClick={(e) => e.preventDefault()}>
                        {t('common:all')} <MdArrowRight size={24} className="inline mx-1" />
                    </Link>
                </div>
            </Wrapper>
        );
    };

    const SuggestedUsers = () => {
        const [suggestedUsers, setSuggestedUsers] = useState<BackendUserSnippet[]>([]);

        const getUsers = async () => {
            let users: BackendUserSnippet[] = [];
            const matching = await fetchGET('/matching', session?.accessToken);

            if (matching.success) {
                users = matching.matching_hits;
            } else {
                users = await fetchGET('/users/list', session?.accessToken);
            }
            if (!users) return [];

            const shuffled = [...Object.entries(users)].sort(() => 0.5 - Math.random());
            const suggestedUsers = shuffled
                .filter((entry) => entry[1].username !== session?.user.preferred_username)
                .slice(0, 5)
                .map((entry) => entry[1]);

            return suggestedUsers;
        };

        useEffect(() => {
            if (suggestedUsers.length) return;

            const cachedSuggestedUsers = LocalStorage.getItem('suggested_users');
            if (cachedSuggestedUsers) {
                setSuggestedUsers(cachedSuggestedUsers);
                return;
            }

            getUsers()
                .then((users) => {
                    setSuggestedUsers(users);
                    LocalStorage.addItem('suggested_users', users, ttl);
                })
                .catch(console.error);
        }, [suggestedUsers]);

        const printUsername = (user: BackendUserSnippet) => {
            if (user.first_name) {
                return (
                    <>
                        {user.first_name} {user.last_name}
                    </>
                );
            }
            return <>{user.username?.replaceAll('_', ' ')}</>;
        };

        if (!suggestedUsers) return <></>;

        return (
            <Wrapper>
                <H2>{t('suggested_users')}</H2>
                <ul className="*:px-2 *:rounded-full *:my-3 *:text-ve-collab-blue">
                    {suggestedUsers.map((user, i) => {
                        return (
                            <li key={i} className="@container">
                                <Link
                                    className="flex items-center justify-center flex-wrap @[230px]:flex-nowrap @[230px]:justify-start truncate p-2"
                                    href={`/profile/user/${user.username}`}
                                >
                                    <span className="shrink-0">
                                        <UserProfileImage
                                            profile_pic={user.profile_pic}
                                            chosen_achievement={user.chosen_achievement}
                                            height={40}
                                            width={40}
                                        />
                                    </span>
                                    <span className="text-slate-900 capitalize truncate inline-block w-full @[230px]:w-fit text-center @[230px]:text-start">
                                        {printUsername(user)}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="px-4 py-2 mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                    <Link href={`/matching`}>
                        {t('common:more')} <MdArrowRight size={24} className="inline mx-1" />
                    </Link>
                </div>
            </Wrapper>
        );
    };

    // if idx given enforces specific module
    const getModule = (idx?: number) => {
        const modules = [<SuggestedLections key={0} />, <SuggestedUsers key={1} />];
        return (
            <>{modules[typeof idx !== 'undefined' ? idx : new Date().getDate() % modules.length]}</>
        );
    };

    return <>{getModule()}</>;
}
