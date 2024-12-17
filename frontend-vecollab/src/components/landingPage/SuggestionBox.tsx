import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MdArrowRight } from 'react-icons/md';
import H2 from '../common/H2';
import { fetchTaxonomy, useGetMatching, useGetUsers } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { BackendUser } from '@/interfaces/api/apiInterfaces';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { getClusterRouteBySlug } from '@/pages/learning-material';
import LocalStorage from '@/lib/storage';

interface ISuggestedLection {
    id: number;
    text: string;
    path: string;
}

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
        const [loading, setLoading] = useState<boolean>(false);

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
            const ttl = 24 * 60 * 60 * 1000;
            if (lections.length) return;
            const storedLections = LocalStorage.getItem('suggested_lections');
            if (storedLections) {
                setLections(storedLections);
                return;
            }
            setLoading(true);
            getSuggestedLection()
                .then((lections) => {
                    setLections(lections);
                    LocalStorage.addItem('suggested_lections', lections, ttl);
                })
                .catch(console.error)
                .finally(() => {
                    setLoading(false);
                });
        }, [lections]);

        if (loading || !lections.length) return <></>;

        return (
            <Wrapper>
                <H2>{t('suggested_materials')}</H2>

                <ul className="d1ivide-y *:px-4 *:py-2 *:rounded-full *:shadow *:my-2 *:text-ve-collab-blue">
                    {lections.map((lection, index) => {
                        return (
                            <li
                                key={index}
                                className="hover:bg-slate-50 hover:text-ve-collab-orange transition ease-in-out"
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
        const [suggestedUsers, setSuggestedUsers] = useState<BackendUser[]>([]);
        const { data: users, isLoading } = useGetUsers(session!.accessToken);

        const { data: matchedUserSnippets, isLoading: isLoadingMatching } = useGetMatching(
            true,
            session!.accessToken
        );

        // remove myself fgrom list
        useEffect(() => {
            if (!users) return;

            const shuffled = [...Object.entries(users)].sort(() => 0.5 - Math.random());
            const suggestedUsers = shuffled
                .filter((entry) => entry[1].username !== session?.user.preferred_username)
                .slice(0, 5)
                .map((entry) => entry[1]);
            console.log({ suggestedUser: suggestedUsers });

            setSuggestedUsers(suggestedUsers);
        }, [users]);
        console.log({ allUsers: users });
        console.log({ matchedUserSnippets });

        const printUsername = (user: BackendUser) => {
            if (user.first_name) {
                return (
                    <>
                        {user.first_name} {user.last_name}
                    </>
                );
            }
            return <>{user.username.replaceAll('_', ' ')}</>;
        };

        if (!suggestedUsers) return <></>;
        return (
            <>
                <H2>{t('suggested_users')}</H2>
                <ul>
                    {suggestedUsers.map((user, i) => {
                        // return <li>{user.username}</li>;
                        return (
                            <a
                                key={i}
                                className="flex m-2 items-center"
                                href={`/profile/user/${user.username}`}
                            >
                                <AuthenticatedImage
                                    imageId={user.profile_pic}
                                    alt={t('profile_picture')}
                                    width={50}
                                    height={50}
                                    className="rounded-full mr-2"
                                ></AuthenticatedImage>
                                <span className="font-bold text-slate-900 capitalize">
                                    {printUsername(user)}
                                </span>
                            </a>
                        );
                    })}
                </ul>
            </>
        );
    };

    // if idx given enforces specific module
    const getModule = (idx?: number) => {
        const modules = [<SuggestedLections key={0} />, <SuggestedUsers key={1} />];
        return (
            <>{modules[typeof idx !== 'undefined' ? idx : new Date().getDate() % modules.length]}</>
        );
    };

    // return <WrapperBox>{getModule(0)}</WrapperBox>;
    return <>{getModule(0)}</>;
}
