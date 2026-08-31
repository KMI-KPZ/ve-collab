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
    useGetMaintenanceBanner,
    useGetOpenReports,
    useIsGlobalAdmin,
} from '@/lib/backend';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
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

    const { data: maintenanceBanner, mutate: mutateMaintenanceBanner } = useGetMaintenanceBanner();
    const [maintenanceMode, setMaintenanceMode] = useState<'date' | 'timeframe' | 'range'>('date');
    const [maintenanceDate, setMaintenanceDate] = useState<string>('');
    const [maintenanceStartTime, setMaintenanceStartTime] = useState<string>('');
    const [maintenanceEndTime, setMaintenanceEndTime] = useState<string>('');
    const [maintenanceStartDate, setMaintenanceStartDate] = useState<string>('');
    const [maintenanceEndDate, setMaintenanceEndDate] = useState<string>('');
    const [maintenanceError, setMaintenanceError] = useState<string>('');

    useEffect(() => {
        if (!maintenanceBanner || !maintenanceBanner.mode) return;
        setMaintenanceMode(maintenanceBanner.mode);
        setMaintenanceDate(maintenanceBanner.date || '');
        setMaintenanceStartTime(maintenanceBanner.start_time || '');
        setMaintenanceEndTime(maintenanceBanner.end_time || '');
        setMaintenanceStartDate(maintenanceBanner.start_date || '');
        setMaintenanceEndDate(maintenanceBanner.end_date || '');
    }, [maintenanceBanner]);

    const buildMaintenancePayload = () => {
        if (maintenanceMode === 'date') {
            return { mode: 'date', date: maintenanceDate };
        } else if (maintenanceMode === 'timeframe') {
            return {
                mode: 'timeframe',
                date: maintenanceDate,
                start_time: maintenanceStartTime,
                end_time: maintenanceEndTime,
            };
        } else {
            return {
                mode: 'range',
                start_date: maintenanceStartDate,
                end_date: maintenanceEndDate,
            };
        }
    };

    const saveAndShowMaintenanceBanner = async () => {
        if (maintenanceMode === 'date' && !maintenanceDate) {
            setMaintenanceError('Bitte ein Datum angeben.');
            return;
        }
        if (
            maintenanceMode === 'timeframe' &&
            (!maintenanceDate || !maintenanceStartTime || !maintenanceEndTime)
        ) {
            setMaintenanceError('Bitte Datum, Start- und Endzeit angeben.');
            return;
        }
        if (maintenanceMode === 'range' && (!maintenanceStartDate || !maintenanceEndDate)) {
            setMaintenanceError('Bitte Start- und Enddatum angeben.');
            return;
        }
        setMaintenanceError('');
        await fetchPOST(
            '/maintenance_banner',
            { enabled: true, ...buildMaintenancePayload() },
            session!.accessToken
        );
        mutateMaintenanceBanner();
    };

    const hideMaintenanceBanner = async () => {
        await fetchPOST(
            '/maintenance_banner',
            { enabled: false, ...buildMaintenancePayload() },
            session!.accessToken
        );
        mutateMaintenanceBanner();
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
                            <ul className="divide-y divide-gray-200">
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
                                className="flex justify-between items-center p-2 border-b border-gray-200"
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
                                            report.type === 'profile' || report.type === 'chatroom'
                                                ? 'text-gray-400 border-red-600/50 cursor-not-allowed'
                                                : 'text-red-600 bg-white'
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                                report.type !== 'profile' &&
                                                report.type !== 'chatroom'
                                            ) {
                                                setAskDeletion(true);
                                            }
                                        }}
                                        disabled={
                                            report.type === 'profile' || report.type === 'chatroom'
                                        } // profiles and chatrooms can't be fully deleted
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
                    <div tabid="maintenance" tabname="Wartungsmodus">
                        <div className="max-w-md">
                            <p className="mb-4">
                                Status:{' '}
                                {maintenanceBanner?.enabled ? (
                                    <span className="font-bold text-green-600">
                                        Banner wird angezeigt
                                    </span>
                                ) : (
                                    <span className="font-bold text-gray-500">
                                        Banner ausgeblendet
                                    </span>
                                )}
                            </p>

                            <p className="font-bold mb-2">Art der Ankündigung</p>
                            <div className="flex flex-col gap-2 mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={maintenanceMode === 'date'}
                                        onChange={() => setMaintenanceMode('date')}
                                    />
                                    Nur Datum
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={maintenanceMode === 'timeframe'}
                                        onChange={() => setMaintenanceMode('timeframe')}
                                    />
                                    Datum + Uhrzeit
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={maintenanceMode === 'range'}
                                        onChange={() => setMaintenanceMode('range')}
                                    />
                                    Zeitraum (mehrere Tage)
                                </label>
                            </div>

                            {maintenanceMode === 'date' && (
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="mr-2">Datum:</p>
                                    <input
                                        type="date"
                                        className="border border-gray-400 rounded-lg p-2"
                                        value={maintenanceDate}
                                        onChange={(e) => setMaintenanceDate(e.target.value)}
                                    />
                                </div>
                            )}

                            {maintenanceMode === 'timeframe' && (
                                <div className="flex flex-col gap-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        <p className="mr-2 w-20">Datum:</p>
                                        <input
                                            type="date"
                                            className="border border-gray-400 rounded-lg p-2"
                                            value={maintenanceDate}
                                            onChange={(e) => setMaintenanceDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="mr-2 w-20">Von:</p>
                                        <input
                                            type="time"
                                            className="border border-gray-400 rounded-lg p-2"
                                            value={maintenanceStartTime}
                                            onChange={(e) =>
                                                setMaintenanceStartTime(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="mr-2 w-20">Bis:</p>
                                        <input
                                            type="time"
                                            className="border border-gray-400 rounded-lg p-2"
                                            value={maintenanceEndTime}
                                            onChange={(e) => setMaintenanceEndTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {maintenanceMode === 'range' && (
                                <div className="flex flex-col gap-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        <p className="mr-2 w-20">Von:</p>
                                        <input
                                            type="date"
                                            className="border border-gray-400 rounded-lg p-2"
                                            value={maintenanceStartDate}
                                            onChange={(e) =>
                                                setMaintenanceStartDate(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="mr-2 w-20">Bis:</p>
                                        <input
                                            type="date"
                                            className="border border-gray-400 rounded-lg p-2"
                                            value={maintenanceEndDate}
                                            onChange={(e) => setMaintenanceEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {maintenanceError && (
                                <p className="text-red-600 mb-4">{maintenanceError}</p>
                            )}

                            <div className="flex gap-4">
                                <ButtonPrimary onClick={saveAndShowMaintenanceBanner}>
                                    Banner speichern &amp; anzeigen
                                </ButtonPrimary>
                                <ButtonSecondary onClick={hideMaintenanceBanner}>
                                    Banner ausblenden
                                </ButtonSecondary>
                            </div>
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
