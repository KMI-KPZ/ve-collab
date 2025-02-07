import WhiteBox from '@/components/common/WhiteBox';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Timestamp from '@/components/common/Timestamp';
import Timeline from '@/components/network/Timeline';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import {
    fetchDELETE,
    fetchPOST,
    useGetAllPlans,
    useGetOpenReports,
    useIsGlobalAdmin,
} from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CustomHead from '@/components/metaData/CustomHead';
import ConfirmDialog from '@/components/common/dialogs/Confirm';

interface Props {
    socket: Socket;
}

AdminDashboard.auth = true;
AdminDashboard.autoForward = true;
export default function AdminDashboard({ socket }: Props): JSX.Element {
    const { data: session } = useSession();
    const router = useRouter();
    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken);
    const { data: plans, isLoading, error, mutate } = useGetAllPlans(session!.accessToken);
    const {
        data: reports,
        isLoading: isLoadingReports,
        error: errorReports,
        mutate: mutateReports,
    } = useGetOpenReports(session!.accessToken);

    const [askDeletion, setAskDeletion] = useState<boolean>(false);

    const [userProfileSnippets, setUserProfileSnippets] = useState<BackendUserSnippet[]>();

    const deleteReportedItem = async (reportId: string) => {
        await fetchDELETE(`/report/delete?report_id=${reportId}`, undefined, session!.accessToken);
        mutateReports();
    };

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
                    <div tabid="reports" tabname="Meldungen">
                        {reports.map((report) => (
                            <div
                                key={report._id}
                                className="flex justify-between items-center p-2 border-b"
                            >
                                <div className="flex justify-between">
                                    <div>
                                        <p>
                                            <span className="font-bold">{report.type}</span> -{' '}
                                            <span className="text-gray-400">{report.item_id}</span>
                                        </p>
                                        <div className="font-bold">Reason:</div>
                                        <p>{report.reason}</p>
                                        <div className="font-bold">Item:</div>
                                        <pre>{JSON.stringify(report.item, null, 2)}</pre>
                                        <div className="font-bold">Report ID:</div>
                                        <p>{report._id}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <button
                                        type="button"
                                        className="bg-ve-collab-orange text-white rounded-lg my-4 p-2 h-16"
                                        onClick={() => {
                                            fetchPOST(
                                                '/report/close',
                                                {
                                                    report_id: report._id,
                                                },
                                                session!.accessToken
                                            ).then(() => {
                                                mutateReports();
                                            });
                                        }}
                                    >
                                        Mark as resolved
                                    </button>
                                    <button
                                        type="button"
                                        className={`border border-red-600 rounded-lg my-4 p-2 h-16 ${
                                            report.type === 'profile'
                                                ? 'text-gray-400 border-red-600/50 cursor-not-allowed'
                                                : 'text-red-600 bg-white'
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (report.type !== 'profile') {
                                                setAskDeletion(true);
                                            }
                                        }}
                                        disabled={report.type === 'profile'} // profiles can't be fully deleted (obviously)
                                    >
                                        Delete reported Item
                                    </button>
                                </div>
                                {askDeletion && (
                                    <ConfirmDialog
                                        message={
                                            "Really delete the reported item? This can't be undone."
                                        }
                                        callback={(proceed) => {
                                            if (proceed) deleteReportedItem(report._id);
                                            setAskDeletion(false);
                                        }}
                                    />
                                )}
                            </div>
                        ))}
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
