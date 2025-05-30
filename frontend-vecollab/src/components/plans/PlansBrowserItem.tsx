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
import Timestamp from '../common/Timestamp';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchGET, fetchPOST } from '@/lib/backend';
import LoadingAnimation from '../common/LoadingAnimation';
import { PlanSummary } from '../planSummary/PlanSummary';
import ConfirmDialog from '../common/dialogs/Confirm';
import Alert, { AlertState } from '../common/dialogs/Alert';
import { useRouter } from 'next/router';
import { FaEye, FaMedal } from 'react-icons/fa';
import { Trans, useTranslation } from 'next-i18next';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';
import { HiOutlineCheckCircle } from 'react-icons/hi';
import { GoAlert } from 'react-icons/go';
import ReportDialog from '../common/dialogs/Report';
import { Tooltip } from '../common/Tooltip';

interface Props {
    plan: PlanPreview;
    refetchPlansCallback: () => Promise<void>;
    isNoAuthPreview?: boolean;
}

export default function PlansBrowserItem({
    plan,
    refetchPlansCallback,
    isNoAuthPreview = false,
}: Props) {
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
    const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false);

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

    const stepsDone = Object.keys(plan.progress).filter(
        (k) => plan.progress[k as keyof ISideProgressBarStates] == ProgressState.completed
    ).length;
    const stepsTotal = Object.keys(initialSideProgressBarStates).filter(
        (a) => a !== 'steps'
    ).length;
    const phasesDone = plan.progress.steps.filter(
        (a) => a[Object.keys(a)[0]] == ProgressState.completed
    ).length;
    const phasesTotal = plan.steps.length;

    const isPlanProgressCompleted = () => stepsDone + phasesDone == stepsTotal + phasesTotal;

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

    if (isNoAuthPreview) {
        return <PlansBrowserItemNoAuthPreview {...plan} />;
    }
    // ensures that we have the username in the next return ...
    if (!session || !username) return <></>;

    const ShareDialog = () => (
        <Dialog
            isOpen={isShareDialogOpen}
            title={t('plans_share_dialog_title')}
            onClose={handleCloseShareDialog}
        >
            <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                <Tabs>
                    <div tabid="new" tabname={t('plans_share_dialog_tabname_new')}>
                        <SharePlanForm
                            closeDialogCallback={handleCloseShareDialog}
                            plan={plan}
                            setAlert={setAlert}
                        />
                    </div>
                    <div tabid="manage" tabname={t('plans_share_dialog_tabname_manage')}>
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
                                className="text-nowrap"
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
                            className="text-nowrap"
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
                <div className="h-[60vh] min-w-[65vw] overflow-y-auto content-scrollbar relative border-t border-gray-200">
                    {loadingSummary ? (
                        <LoadingAnimation />
                    ) : (
                        <div className="flex w-full">
                            <PlanSummary plan={planSummary!} openAllBoxes={true} />
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
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
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
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
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
                            ? t('plans_shared_with_x_users', {
                                  count: plan.read_access.length - 1,
                              })
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
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                createCopy(plan._id);
            }}
        >
            <MdOutlineCopyAll title={t('create_copy')} />
        </button>
    );

    const ReportButton = () => (
        <button
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700 cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                setReportDialogOpen(true);
            }}
        >
            <GoAlert title={t('report.report_title')} />
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
            <div className="basis-1/12 flex justify-center text-center hidden md:block">
                {isPlanProgressCompleted() ? (
                    <Tooltip
                        tooltipsText={
                            <Trans
                                i18nKey="plans_title_all_steps_completed"
                                components={{
                                    br: <br />,
                                    italic: <i />,
                                    checkMark: <HiOutlineCheckCircle className="inline" />,
                                }}
                                values={{
                                    stepsTotal,
                                    phasesTotal,
                                }}
                            />
                        }
                        position="bottom-right"
                        className="text-left"
                    >
                        <HiOutlineCheckCircle size={23} />
                    </Tooltip>
                ) : (
                    <Tooltip
                        tooltipsText={
                            <Trans
                                i18nKey="plans_title_partial_steps_completed"
                                ns="common"
                                components={{
                                    br: <br />,
                                    bold: <strong />,
                                    italic: <i />,
                                    checkMark: <HiOutlineCheckCircle className="inline" />,
                                }}
                                values={{
                                    stepsDone,
                                    stepsTotal,
                                    phasesDone,
                                    phasesTotal,
                                }}
                            />
                        }
                        position="bottom-right"
                        className="text-left"
                    >
                        <span className="text-center text-sm text-slate-800 whitespace-nowrap cursor-pointer">
                            {stepsDone + phasesDone} / {stepsTotal + phasesTotal}
                        </span>
                    </Tooltip>
                )}
            </div>

            <div
                className="grow basis-5/6 sm:basis-4/6 md:basis-5/12 font-normal text-base group hover:cursor-pointer truncate"
                onClick={(e) => {
                    e.stopPropagation();
                    if (plan.write_access.includes(username)) {
                        forward(plan._id);
                    } else {
                        openPlanSummary();
                    }
                }}
            >
                <div className="flex items-center flex-wrap">
                    <div className="flex order-1 truncate xl:max-w-[60%] items-center">
                        <div className="grow mr-2 font-bold whitespace-nowrap truncate">
                            <Link href={`/plan/${plan._id}`} onClick={(e) => e.preventDefault()}>
                                {plan.name}
                            </Link>
                        </div>
                        {plan.is_good_practise && (
                            <div className="mx-2 text-ve-collab-blue rounded-full p-1 border border-ve-collab-blue">
                                <FaMedal title={t('plans_marked_as_good_practise')} />
                            </div>
                        )}
                    </div>
                    {plan.abstract && (
                        <div className="w-full order-2 xl:order-3 mr-2 text-gray-700 text-sm truncate">
                            {plan.abstract}
                        </div>
                    )}
                    {plan.topics.length > 0 && (
                        <div className="w-full order-2 xl:order-3 mr-2 text-gray-700 text-sm italic truncate">
                            {plan.topics.join(' / ')}
                        </div>
                    )}
                    <div className="order-3 xl:order-2 flex text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <ReportButton />
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

            <div className="basis-1/6 hidden sm:block">
                <Timestamp
                    timestamp={plan.last_modified}
                    className="text-sm"
                    dateFormat="dd. MMM yy"
                />
            </div>

            <div className="basis-1/6 hidden md:block">
                <Timestamp
                    timestamp={plan.creation_timestamp}
                    className="text-sm"
                    dateFormat="dd. MMM yy"
                />
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

            {reportDialogOpen && (
                <ReportDialog
                    reportedItemId={plan._id}
                    reportedItemType="plan"
                    closeCallback={() => {
                        setReportDialogOpen(false);
                    }}
                />
            )}

            <Alert state={alert} />
        </>
    );
}

function PlansBrowserItemNoAuthPreview(plan: PlanPreview) {
    const { t } = useTranslation('common');

    const stepsToProgress =
        Object.keys(initialSideProgressBarStates).filter((a) => a !== 'steps').length +
        plan.steps.length;

    const completedSteps =
        Object.keys(plan.progress).filter(
            (k) => plan.progress[k as keyof ISideProgressBarStates] == ProgressState.completed
        ).length +
        plan.progress.steps.filter((a) => a[Object.keys(a)[0]] == ProgressState.completed).length;

    const isPlanProgressCompleted = () => completedSteps == stepsToProgress;

    const username = 'John Doe';
    return (
        <>
            <div className="basis-1/12 flex justify-center">
                {isPlanProgressCompleted() ? (
                    <span title={t('plans_title_all_steps_completed')}>
                        <HiOutlineCheckCircle size={23} />
                    </span>
                ) : (
                    <span
                        className="w-[72px] text-center rounded-full border border-gray-200 px-2 py-1 -m-1 whitespace-nowrap"
                        title={t('plans_title_partial_steps_completed', {
                            count: completedSteps,
                            total: stepsToProgress,
                        })}
                    >
                        {completedSteps} / {stepsToProgress}
                    </span>
                )}
            </div>

            <div className="grow md:basis-5/12 font-normal text-base group truncate">
                <div className="flex flex-wrap xl:flex-nowrap items-center">
                    <div
                        className="mr-2 py-1 font-bold whitespace-nowrap truncate"
                        title={plan.name}
                    >
                        <div>{plan.name}</div>
                    </div>
                    {plan.is_good_practise && (
                        <div className="mx-2 text-ve-collab-blue rounded-full p-1 border border-ve-collab-blue">
                            <FaMedal title={t('plans_marked_as_good_practise')} />
                        </div>
                    )}
                    <div className="flex text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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

            <div className="basis-1/6 hidden md:block">
                <Timestamp timestamp={plan.last_modified} className="text-sm" />
            </div>

            <div className="basis-1/6 hidden md:block">
                <Timestamp timestamp={plan.creation_timestamp} className="text-sm" />
            </div>
        </>
    );
}
