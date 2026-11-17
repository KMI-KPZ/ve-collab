import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { MdArrowRight } from 'react-icons/md';
import H2 from '../common/H2';
import { fetchGET, fetchTaxonomy, getTopLevelNodes } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { BackendGroupSuggestion, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import LocalStorage from '@/lib/storage';
import AuthenticatedImage from '../common/AuthenticatedImage';
import UserProfileImage from '../network/UserProfileImage';
import printUsername from '../common/Username';

interface ISuggestedModul {
    id: number;
    text: string;
    text_en: string;
    path: string;
}

const ttl = 24 * 60 * 60 * 1000;

SuggestionBox.auth = true;
export default function SuggestionBox() {
    const { t } = useTranslation(['community', 'common']);
    const { data: session } = useSession();
    const router = useRouter();

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
            <div className="w-full m-6 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg">
                <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
                <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>
                {children}
            </div>
        );
    };

    const SuggestedModules = () => {
        const [modul, setModuls] = useState<ISuggestedModul[]>([]);

        const getSuggestedModules = async () => {
            let allModules: ISuggestedModul[] = [];
            const taxonomy = await fetchTaxonomy();
            const cluster = await getTopLevelNodes();
            const clusterIds = cluster.map((a) => a.id);

            taxonomy.map((node) => {
                if (clusterIds.includes(node.parent)) {
                    const parent = cluster.find((a) => a.id == node.parent);
                    allModules.push({
                        id: node.id,
                        text: node.text,
                        text_en: node.text_en,
                        path: `/learning-material/${parent?.text!}/${node?.text}`,
                    });
                }
            });

            return allModules.sort(() => 0.5 - Math.random()).slice(0, 5);
        };

        useEffect(() => {
            const storedModules = LocalStorage.getItem('suggested_modules');
            if (storedModules) {
                setModuls(storedModules);
                return;
            }
            getSuggestedModules()
                .then((moduls) => {
                    setModuls(moduls);
                    LocalStorage.addItem('suggested_modules', moduls, ttl);
                })
                .catch(console.error);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        if (!modul.length) return <></>;

        return (
            <Wrapper>
                <H2>{t('suggested_materials')}</H2>

                <ul className="*:px-4 *:py-2 *:my-3 *:text-ve-collab-blue">
                    {modul.map((lection, index) => {
                        return (
                            <li
                                key={index}
                                className="hover:text-ve-collab-orange transition ease-in-out"
                            >
                                <Link href={`${lection.path}`}>
                                    {router.locale === 'en' && lection.text_en
                                        ? lection.text_en
                                        : lection.text}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="px-4 py-2 mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                    <Link href={`/learning-material`}>
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
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

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
                                    <span className="text-slate-900 capitalize truncate inline-block w-full @[230px]:w-fit text-center @[230px]:text-start hover:text-ve-collab-orange">
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

    const SuggestedGroups = () => {
        const [suggestedGroups, setSuggestedGroups] = useState<BackendGroupSuggestion[]>([]);

        useEffect(() => {
            const cachedSuggestedGroups = LocalStorage.getItem('suggested_groups');
            if (cachedSuggestedGroups) {
                setSuggestedGroups(cachedSuggestedGroups);
                return;
            }

            fetchGET('/group_suggestions', session?.accessToken)
                .then((response) => {
                    // only cache actual suggestions, not a failed request
                    if (!response.success) return;
                    setSuggestedGroups(response.suggestions);
                    LocalStorage.addItem('suggested_groups', response.suggestions, ttl);
                })
                .catch(console.error);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        if (!suggestedGroups.length) return <></>;

        return (
            <Wrapper>
                <H2>{t('suggested_groups')}</H2>
                <ul className="*:px-2 *:rounded-full *:my-3 *:text-ve-collab-blue">
                    {suggestedGroups.map((group) => {
                        return (
                            <li key={group._id} className="@container">
                                <Link
                                    className="flex items-center justify-center flex-wrap @[230px]:flex-nowrap @[230px]:justify-start truncate p-2"
                                    href={`/group/${group._id}`}
                                >
                                    <span className="shrink-0">
                                        <AuthenticatedImage
                                            imageId={group.space_pic}
                                            alt={t('group_picture')}
                                            width={40}
                                            height={40}
                                            className="rounded-full mr-3"
                                        />
                                    </span>
                                    <span className="text-slate-900 truncate inline-block w-full @[230px]:w-fit text-center @[230px]:text-start hover:text-ve-collab-orange">
                                        {group.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="px-4 py-2 mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                    <Link href={`/groups`}>
                        {t('common:more')} <MdArrowRight size={24} className="inline mx-1" />
                    </Link>
                </div>
            </Wrapper>
        );
    };

    // if idx given enforces specific module
    const getModule = (idx?: number) => {
        const modules = [
            <SuggestedModules key={0} />,
            <SuggestedUsers key={1} />,
            <SuggestedGroups key={2} />,
        ];
        return (
            <>{modules[typeof idx !== 'undefined' ? idx : new Date().getDate() % modules.length]}</>
        );
    };

    return <>{getModule()}</>;
}
