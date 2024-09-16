import Link from 'next/link';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import React, { useState } from 'react';
import SharePlanForm from './SharePlanForm';
import EditAccessList from './EditAccessList';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { ISideProgressBarStates, ProgressState } from '@/interfaces/ve-designer/sideProgressBar';
import {
    MdShare,
    MdDelete,
    MdEdit,
    MdOutlineCopyAll,
    MdOutlineFileDownload,
} from 'react-icons/md';
import { GrStatusGood } from 'react-icons/gr'
import Timestamp from '../common/Timestamp';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchGET, fetchPOST } from '@/lib/backend';
import LoadingAnimation from '../common/LoadingAnimation';
import { PlanSummary } from '../planSummary/PlanSummary';
import ConfirmDialog from '../common/dialogs/Confirm';
import Alert, { AlertState } from '../common/dialogs/Alert';
import { useRouter } from 'next/router';
import { FaEye } from 'react-icons/fa';
import { useTranslation } from 'next-i18next';

interface Props {
    plan: PlanPreview;
    refetchPlansCallback: () => Promise<void>;
}

export default function PlansBrowserItem({ plan, refetchPlansCallback }: Props) {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation('common');

    const username = session?.user.preferred_username;

    const [alert, setAlert] = useState<AlertState>({ open: false });

    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isSummaryOpen, setSummaryOpen] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
    const [planSummary, setPlanSummary] = useState<IPlan>();
    const [askDeletion, setAskDeletion] = useState<boolean>(false);

    // BACKLOG: remember this cool useSWRMutation to trigger changes
    // const getPlanById = async (url: string, { arg }: { arg: string }) => {
    //     await fetchGET(`${url}?_id=${arg}`, session?.accessToken)
    // }
    // const { trigger: triggerGetPlanById } = useSWRMutation('/planner/get', getPlanById )
    // await triggerGetPlanById(plan._id)


    const handleCloseShareDialog = async () => {
        setIsShareDialogOpen(false);
        // refetch plans to have all up-to-date information without having to reload the page
        await refetchPlansCallback();
    };

    // const completedProgress: { [key: string]:  ProgressState } = {
    //     name: ProgressState.completed
    // }

    // const isPlanProgressCompleted = (): boolean => {
    //     return Object.keys(completedProgress).every(k => plan.progress[k as keyof ISideProgressBarStates] == completedProgress[k] )
    // }

    const getCompletedStates = () =>
        Object.keys(plan.progress).filter(
            (k) => plan.progress[k as keyof ISideProgressBarStates] == ProgressState.completed
        ).length;

    const openPlanSummary = () => {
        setSummaryOpen(true);
        setLoadingSummary(true);

        fetchGET(`/planner/get?_id=${plan._id}`, session?.accessToken).then((data) => {
            setPlanSummary(data.plan);
            setLoadingSummary(false);
        });
    };

    const forward = async (planId: string) => {
        await router.push({
            pathname: '/ve-designer/name',
            query: { plannerId: planId },
        });
    };

    // ensures that we have the username in the next return ...
    if (!session || !username) return <></>;

    const ShareDialog = () => (
        <Dialog isOpen={isShareDialogOpen} title={t('plans_share_dialog_title')} onClose={handleCloseShareDialog}>
            <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                <Tabs>
                    <div tabname={t("plans_share_dialog_tabname_new")}>
                        <SharePlanForm
                            closeDialogCallback={handleCloseShareDialog}
                            planId={plan._id}
                            setAlert={setAlert}
                        />
                    </div>
                    <div tabname={t("plans_share_dialog_tabname_manage")}>
                        <EditAccessList
                            closeDialogCallback={handleCloseShareDialog}
                            plan={plan}
                            setAlert={setAlert}
                        />
                    </div>
                </Tabs>
            </div>
        </Dialog>
    );

    const SummaryDialog = () => (
        <Dialog
            isOpen={isSummaryOpen}
            title="Zusammenfassung"
            onClose={() => {
                setSummaryOpen(false);
                setPlanSummary(undefined);
            }}
        >
            <div>
                {plan.write_access.includes(username) ? (
                    <div className="absolute top-0 right-10 flex">
                        <div
                            className="m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20 cursor-pointer"
                            onClick={() => forward(plan._id)}
                        >
                            <MdEdit className="inline" /> Bearbeiten
                        </div>
                        <Link
                            className="m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                            href={{
                                pathname: `/api/pdf-plan`,
                                query: { planId: plan._id },
                            }}
                        >
                            <MdOutlineFileDownload className="inline" /> Herunterladen
                        </Link>
                    </div>
                ) : (
                    <div className="absolute top-0 right-10 flex">
                        <Link
                            className="m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                            href={{
                                pathname: `/api/pdf-plan`,
                                query: { planId: plan._id },
                            }}
                        >
                            <MdOutlineFileDownload className="inline" /> Herunterladen
                        </Link>
                    </div>
                )}
                <div className="w-[70vw] h-[60vh] overflow-y-auto content-scrollbar relative">
                    {loadingSummary ? (
                        <LoadingAnimation />
                    ) : (
                        <div className="gap-y-6 w-full px-12 py-6 max-w-screen-2xl items-center flex flex-col justify-content">
                            <div className={'text-center font-bold text-3xl mb-2'}>{plan.name}</div>
                            <div className="flex w-full">
                                <PlanSummary plan={planSummary!} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );

    const ViewButton = () => (
        <div
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                openPlanSummary()
            }}
            title="Zusammenfassung anzeigen"
        >
            <FaEye />
        </div>
    );

    const DeleteButton = () => (
        <button
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700"
            onClick={(e) => {
                e.stopPropagation();
                setAskDeletion(true);
            }}
        >
            <MdDelete title="Plan löschen" />
        </button>
    );

    const ShareButton = () => (
        <button
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700"
            onClick={(e) => {
                e.stopPropagation();
                setIsShareDialogOpen(true);
            }}
        >
            {plan.read_access.length > 1 ? (
                <MdShare
                    className="text-green-600"
                    title={`Plan geteilt mit ${plan.read_access.length - 1} Benutzer${
                        plan.read_access.length > 2 ? 'n' : ''
                    }`}
                />
            ) : (
                <MdShare title="Plan teilen" />
            )}
        </button>
    );

    const CopyButton = () => (
        <button
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700"
            onClick={(e) => {
                e.stopPropagation();
                createCopy(plan._id);
            }}
        >
            <MdOutlineCopyAll title="Kopie erstellen" />
        </button>
    );

    const deletePlan = async (planId: string) => {
        const response = await fetchDELETE(
            `/planner/delete?_id=${planId}`,
            {},
            session?.accessToken
        );
        if (response.success === true) {
            refetchPlansCallback(); // refresh plans
        }
        setAlert({
            message: 'Plan gelöscht',
            autoclose: 2000,
            onClose: () => setAlert({ open: false })
        });
    };

    const createCopy = async (planId: string) => {
        const response = await fetchPOST(
            `/planner/copy`,
            { plan_id: planId },
            session?.accessToken
        );
        if (response.success === true) {
            refetchPlansCallback(); // refresh plans
            setAlert({
                message: 'Plan kopiert',
                autoclose: 2000,
                onClose: () => setAlert({ open: false }),
            });
        } else {
            switch (response.reason) {
                case 'insufficient_permission':
                    setAlert({
                        message: 'Du hast keine Rechte, diesen Plan zu kopieren',
                        autoclose: 2000,
                        type: 'error',
                        onClose: () => setAlert({ open: false }),
                    });
                    return;
                case 'plan_doesnt_exist':
                    setAlert({
                        message: 'Dieser Plan existiert nicht',
                        autoclose: 2000,
                        type: 'error',
                        onClose: () => setAlert({ open: false }),
                    });
                    return;
                default:
                    setAlert({
                        message: 'unerwarteter Fehler beim Kopieren des Plans',
                        autoclose: 2000,
                        type: 'error',
                        onClose: () => setAlert({ open: false }),
                    });
                    return;
            }
        }
    };

    return (
        <>
            <div className="basis-1/12 text-center">
                {/* {isPlanProgressCompleted() ?<MdCheck /> : <></>} */}
                <span className="rounded-full border p-2 whitespace-nowrap">
                    {getCompletedStates()} / {Object.keys(plan.progress).length}
                </span>
            </div>

            <div
                className="grow font-normal text-base group hover:cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    if (plan.write_access.includes(username)) {
                        forward(plan._id);
                    } else {
                        openPlanSummary()
                    }
                }}
            >
                <div className="flex items-center">
                    <div className="mr-2 py-1 font-bold whitespace-nowrap">
                        <Link href={`/plan/${plan._id}`} onClick={(e) => e.preventDefault()}>
                            {plan.name}
                        </Link>
                    </div>
                    {plan.is_good_practise && (
                        <div className="mr-2 text-slate-700">
                            <GrStatusGood title='Plan ist als "Good Practice" markiert' />
                        </div>
                    )}
                    {/* {(plan.author == username && plan.read_access.length > 1) && (
                        <div className='mr-2 text-lime-600'>
                            <MdShare title={`Plan geteilt mit ${plan.read_access.length-1} Benutzer${plan.read_access.length > 2 ? "n" : ""}`} />
                        </div>
                    )} */}
                    <div className="flex text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {plan.author.username == username && (
                            <>
                                <ViewButton />
                                <CopyButton />
                                <ShareButton />
                                <DeleteButton />
                            </>
                        )}
                        {plan.author.username != username && plan.write_access.includes(username) && (
                            <>
                                <ViewButton />
                                <CopyButton />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="basis-1/6 truncate">
                {plan.author.username === username ? (
                    <>{plan.author.first_name} {plan.author.last_name}</>
                ) : (
                    <span title={`Plan geteilt von ${plan.author.first_name} ${plan.author.last_name}`}>
                        <MdShare className="inline m-1 text-slate-900" /> {plan.author.first_name} {plan.author.last_name}
                    </span>
                )}
            </div>

            <div className="basis-1/6">
                <Timestamp timestamp={plan.last_modified} className="text-sm" />
            </div>

            <div className="basis-1/6">
                <Timestamp timestamp={plan.creation_timestamp} className="text-sm" />
            </div>

            <ShareDialog />

            <SummaryDialog />

            {askDeletion && (
                <ConfirmDialog
                    message="Plan löschen?"
                    callback={(proceed) => {
                        if (proceed) deletePlan(plan._id);
                        setAskDeletion(false);
                    }}
                />
            )}

            <Alert state={alert} />
        </>
    );
}
