import WhiteBox from '@/components/common/WhiteBox';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Timestamp from '@/components/common/Timestamp';
import Timeline from '@/components/network/Timeline';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchPOST, useGetAllPlans, useIsGlobalAdmin } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CustomHead from '@/components/metaData/CustomHead';

interface Props {
    socket: Socket;
}

AdminDashboard.auth = true;
export default function AdminDashboard({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken);
    const { data: plans, isLoading, error, mutate } = useGetAllPlans(session!.accessToken);

    const [userProfileSnippets, setUserProfileSnippets] = useState<BackendUserSnippet[]>();

    useEffect(() => {
        if (isLoading || error || !session || !plans) {
            return;
        }

        fetchPOST(
            '/profile_snippets',
            {
                usernames: [...new Set(plans.map((plan) => plan.author.username))],
            },
            session!.accessToken
        ).then((data) => {
            setUserProfileSnippets(data.user_snippets);
        });
    }, [isLoading, session, plans, error]);

    if (!isGlobalAdmin) {
        return (
            <div className="flex justify-center items-center pt-20 pb-20">
                <div className="flex flex-col w-1/2 justify-center items-center rounded-lg shadow-md bg-white p-10">
                    <p className="font-bold text-3xl pt-5 pb-3">Zugriff verweigert</p>
                    <p className="pb-10">Du bist kein Administrator</p>

                    <button
                        type="button"
                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                        onClick={(e) => {
                            e.preventDefault();
                            router.back();
                        }}
                    >
                        Zurück zur vorherigen Seite
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <CustomHead pageTitle={'admin'} pageSlug={'admin'} />
            <WhiteBox>
                <VerticalTabs>
                    <div tabid="posts" tabname="Posts">
                        <div className="h-screen overflow-y-auto">
                            <Timeline socket={socket} userIsAdmin={true} adminDashboard={true} />
                        </div>
                    </div>
                    <div tabid="plans" tabname="VE-Pläne">
                        <div className="h-screen overflow-y-auto">
                            {isLoading && <LoadingAnimation />}
                            <ul className="divide-y">
                                {plans
                                    .sort((a, b) => {
                                        return (
                                            new Date(b.last_modified).getTime() -
                                            new Date(a.last_modified).getTime()
                                        );
                                    })
                                    .map((plan) => (
                                        <li className="py-2" key={plan._id}>
                                            <div className="flex">
                                                <div className="mx-2">
                                                    <Link
                                                        href={`/plan/${plan._id}`}
                                                        target="_blank"
                                                        className="text-xl font-bold leading-tight text-gray-800"
                                                    >
                                                        {plan.name}
                                                    </Link>
                                                    <Link
                                                        href={`/profile?username=${plan.author}`}
                                                        target="_blank"
                                                    >
                                                        <div className="text-md text-gray-500">
                                                            {userProfileSnippets?.find(
                                                                (snippet) =>
                                                                    snippet.username ===
                                                                    plan.author.username
                                                            )?.first_name +
                                                                ' ' +
                                                                userProfileSnippets?.find(
                                                                    (snippet) =>
                                                                        snippet.username ===
                                                                        plan.author.username
                                                                )?.last_name}
                                                        </div>
                                                        <div className="text-md text-gray-500">
                                                            {plan.author.first_name}{' '}
                                                            {plan.author.last_name}
                                                        </div>
                                                    </Link>
                                                </div>
                                                <div className="mx-2 flex items-end">
                                                    <div>
                                                        <div className="flex">
                                                            <p className="text-md text-gray-500 mx-2">
                                                                Erstellt:
                                                            </p>
                                                            <Timestamp
                                                                timestamp={plan.creation_timestamp}
                                                            />
                                                        </div>
                                                        <div className="flex">
                                                            <p className="text-md text-gray-500 mx-2">
                                                                Zuletzt bearbeitet:
                                                            </p>

                                                            <Timestamp
                                                                timestamp={plan.last_modified}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                </VerticalTabs>
            </WhiteBox>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
