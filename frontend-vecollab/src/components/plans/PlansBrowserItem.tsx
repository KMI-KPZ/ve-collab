import Link from 'next/link';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import React, { useState } from 'react';
import SharePlanForm from './SharePlanForm';
import EditAccessList from './EditAccessList';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { MdShare, MdDelete, MdEdit, MdOutlineCopyAll, MdOutlineFileDownload } from 'react-icons/md';
import { GrStatusGood } from 'react-icons/gr';
import Timestamp from '../common/Timestamp';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchGET, fetchPOST } from '@/lib/backend';
import LoadingAnimation from '../common/LoadingAnimation';
import { PlanSummary } from '../planSummary/PlanSummary';
import ConfirmDialog from '../common/dialogs/Confirm';
import Alert, { AlertState } from '../common/dialogs/Alert';
import { useRouter } from 'next/router';
import { FaEye } from 'react-icons/fa';
import { Trans, useTranslation } from 'next-i18next';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';

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

    const getStepsToProgress = () =>
        Object.keys(initialSideProgressBarStates).filter((a) => a !== 'steps').length +
        plan.steps.length;

    const getCompletedSteps = () =>
        Object.keys(plan.progress).filter(
            (k) => plan.progress[k as keyof ISideProgressBarStates] == ProgressState.completed
        ).length +
        plan.progress.steps.filter((a) => a[Object.keys(a)[0]] == ProgressState.completed).length;

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
        <Dialog
            isOpen={isShareDialogOpen}
            title={t('plans_share_dialog_title')}
            onClose={handleCloseShareDialog}
        >
            <div className="w-getStepsToProgress[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                <Tabs>
                    <div tabname={t('plans_share_dialog_tabname_new')}>
                        <SharePlanForm
                            closeDialogCallback={handleCloseShareDialog}
                            planId={plan._id}
                            setAlert={setAlert}
                        />
                    </div>
                    <div tabname={t('plans_share_dialog_tabname_manage')}>
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
            title={
                <>
                    <div className="text-2xl font-semibold italic text-slate-900">
                        <Trans i18nKey="summary">
                            Summary of the
                            <span className="ml-2 before:block before:absolute before:-inset-1 before:-skew-y-3 before:bg-ve-collab-orange relative inline-block">
                                <span className="relative text-white">plan</span>
                            </span>
                        </Trans>
                    </div>

                    <div className="flex ml-auto mr-2 gap-x-2">
                        {plan.write_access.includes(username) && (
                            <ButtonLightBlue
                                classNameExtend="text-nowrap"
                                onClick={() =>
                                    router.push({
                                        pathname: '/ve-designer/name',
                                        query: { plannerId: plan._id },
                                    })
                                }
                            >
                                <MdEdit className="inline" /> {t('edit')}
                            </ButtonLightBlue>
                        )}

                        <ButtonLightBlue
                            classNameExtend="text-nowrap"
                            onClick={() => {
                                router.push({
                                    pathname: `/api/pdf-plan`,
                                    query: { planId: plan._id, locale: router.locale },
                                });
                            }}
                        >
                            <MdOutlineFileDownload className="inline" /> {t('download')}
                        </ButtonLightBlue>
                    </div>
                </>
            }
            onClose={() => {
                setSummaryOpen(false);
                setPlanSummary(undefined);
            }}
        >
            <div>
                <div className="h-[60vh] overflow-y-auto content-scrollbar relative border-t">
                    {loadingSummary ? (
                        <LoadingAnimation />
                    ) : (
                        <div className="flex w-full">
                            <PlanSummary plan={planSummary!} />
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );

    const EditButton = () => (
        <div
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                forward(plan._id);
            }}
            title={t('edit')}
        >
            <MdEdit />
        </div>
    );

    const ViewButton = () => (
        <div
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                openPlanSummary();
            }}
            title={t('show_summary')}
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
            <MdDelete title={t('delete_plan')} />
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
                    title={
                        plan.read_access.length > 2
                            ? t('plans_shared_with_x_users', { count: plan.read_access.length - 1 })
                            : t('plans_shared_with_1_user')
                    }
                />
            ) : (
                <MdShare title={t('share_plan')} />
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
            <MdOutlineCopyAll title={t('create_copy')} />
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
            message: t('plans_alert_deleted'),
            autoclose: 2000,
            onClose: () => setAlert({ open: false }),
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
                message: t('plans_alert_copied'),
                autoclose: 2000,
                onClose: () => setAlert({ open: false }),
            });
        } else {
            switch (response.reason) {
                case 'insufficient_permission':
                    setAlert({
                        message: t('plans_alert_copy_insufficient_permission'),
                        autoclose: 2000,
                        type: 'error',
                        onClose: () => setAlert({ open: false }),
                    });
                    return;
                case 'plan_doesnt_exist':
                    setAlert({
                        message: t('plans_alert_doesnt_exist'),
                        autoclose: 2000,
                        type: 'error',
                        onClose: () => setAlert({ open: false }),
                    });
                    return;
                default:
                    setAlert({
                        message: t('plans_alert_copy_unexpected_error'),
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
                    {getCompletedSteps()} / {getStepsToProgress()}
                </span>
            </div>

            <div
                className="grow font-normal text-base group hover:cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    if (plan.write_access.includes(username)) {
                        forward(plan._id);
                    } else {
                        openPlanSummary();
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
                            <GrStatusGood title={t('plans_marked_as_good_practise')} />
                        </div>
                    )}
                    <div className="flex text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ViewButton />
                        {plan.write_access.includes(username) && (
                            <>
                                <EditButton />
                                <CopyButton />
                            </>
                        )}
                        {plan.author.username == username && (
                            <>
                                <ShareButton />
                                <DeleteButton />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="basis-1/6 truncate">
                {plan.author.username === username ? (
                    <>
                        {plan.author.first_name} {plan.author.last_name}
                    </>
                ) : (
                    <span
                        title={t('plans_shared_by', {
                            name: `${plan.author.first_name} ${plan.author.last_name}`,
                        })}
                    >
                        <MdShare className="inline m-1 text-slate-900" /> {plan.author.first_name}{' '}
                        {plan.author.last_name}
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
                    message={t('plans_confirm_delete')}
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
