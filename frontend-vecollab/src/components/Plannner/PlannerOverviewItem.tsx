import Link from 'next/link';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import React, { useState } from 'react';
import SharePlanForm from './SharePlanForm';
import EditAccessList from './EditAccessList';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { ISideProgressBarStates, ProgressState } from '@/interfaces/ve-designer/sideProgressBar';
import { MdShare, MdDelete, MdEdit, MdPublic } from 'react-icons/md';
import Timestamp from '../Timestamp';
import { useSession } from 'next-auth/react';
import { fetchDELETE, fetchGET } from '@/lib/backend';
import LoadingAnimation from '../LoadingAnimation';
import { PlanOverview } from '../planSummary/planOverview';
import ConfirmDialog from '../Confirm';
import Alert, { AlertState } from '../Alert';

interface Props {
    plan: PlanPreview;
    refetchPlansCallback: () => Promise<void>;
}

export default function PlannerOverviewItem({ plan, refetchPlansCallback }: Props) {
    const { data: session } = useSession();
    const username = session?.user.preferred_username;

    const [alert, setAlert] = useState<AlertState>({open: false});

    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isSummaryOpen, setSummaryOpen] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
    const [planSummary, setPlanSummary] = useState<IPlan>();
    const [askDeletion, setAskDeletion] = useState<boolean>(false)

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

    // ensures that we have the username in the next return ...
    if (!session || !username) return <></>;

    const ShareDialog = () => (
        <Dialog isOpen={isShareDialogOpen} title={`Teilen`} onClose={handleCloseShareDialog}>
            <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                <Tabs>
                    <div tabname="Neu">
                        <SharePlanForm
                            closeDialogCallback={handleCloseShareDialog}
                            planId={plan._id}
                            setAlert={setAlert}
                        />
                    </div>
                    <div tabname="Verwalten">
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
                {plan.write_access.includes(username) && (
                    <Link
                        className='absolute top-0 right-10 m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20'
                        href={{
                            pathname: '/ve-designer/name',
                            query: { plannerId: plan._id },
                        }}
                    >
                        <MdEdit className="inline" /> Bearbeiten
                    </Link>
                )}
                <div className="w-[70vw] h-[60vh] overflow-y-auto content-scrollbar relative">
                    {loadingSummary ? (
                        <LoadingAnimation />
                    ) : (
                        <div className="gap-y-6 w-full px-12 py-6 max-w-screen-2xl items-center flex flex-col justify-content">
                            <div className={'text-center font-bold text-3xl mb-2'}>{plan.name}</div>
                            <div className="flex w-full">
                                <PlanOverview plan={planSummary!} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );

    const EditButton = () => (
        <Link
            href={{
                pathname: '/ve-designer/name',
                query: { plannerId: plan._id },
            }}
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700"
            onClick={(e) => e.stopPropagation()}
            title='Plan bearbeiten'
        >
            <MdEdit />
        </Link>
    );

    const DeleteButton = () => (
        <button
            className="p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700"
            onClick={(e) => {
                e.stopPropagation();
                setAskDeletion(true)
            }}
        >
            <MdDelete title='Plan löschen' />
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
                    title={`Plan geteilt mit ${plan.read_access.length - 1} Benutzer${plan.read_access.length > 2 ? 'n' : ''
                        }`}
                />
            ) : (
                <MdShare title='Plan teilen' />
            )}
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
        setAlert({message: 'Plan gelöscht'})
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
                className="grow p-3 font-normal text-base group hover:cursor-pointer"
                onClick={() => openPlanSummary()}
            >
                <div className="flex items-center">
                    <div className="mr-2 py-1 font-bold whitespace-nowrap">
                        <Link href={`/plan/${plan._id}`} onClick={e => e.preventDefault()}>
                            {plan.name}
                        </Link>
                    </div>
                    {plan.is_good_practise && (
                        <div className="mr-2 text-slate-700">
                            <MdPublic title='Plan ist als "good practice" markiert' />
                        </div>
                    )}
                    {/* {(plan.author == username && plan.read_access.length > 1) && (
                        <div className='mr-2 text-lime-600'>
                            <MdShare title={`Plan geteilt mit ${plan.read_access.length-1} Benutzer${plan.read_access.length > 2 ? "n" : ""}`} />
                        </div>
                    )} */}
                    <div className="flex text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {plan.author == username && (
                            <>
                                <ShareButton />
                                <EditButton />
                                <DeleteButton />
                            </>
                        )}
                        {plan.author != username && plan.write_access.includes(username) && (
                            <EditButton />
                        )}
                    </div>
                </div>
            </div>

            <div className="basis-1/6">
                {plan.author === username ? (
                    <>{plan.author}</>
                ) : (
                    <span title={`Plan geteilt von ${plan.author}`}>
                        <MdShare className="inline m-1 text-slate-900" /> {plan.author}
                    </span>
                )}
            </div>

            <div className="basis-1/6">
                <Timestamp timestamp={plan.creation_timestamp} className="text-sm" />
            </div>

            <div className="basis-1/6">
                <Timestamp timestamp={plan.last_modified} className="text-sm" />
            </div>

            <ShareDialog />

            <SummaryDialog />

            {askDeletion && (
                <ConfirmDialog message="Plan löschen?" callback={proceed => {
                    if (proceed) deletePlan(plan._id);
                    setAskDeletion(false)
                }} />
            )}

            {alert.open !== false && (
                <Alert autoclose={2000} onClose={() => setAlert({open: false})}>{alert.message}</Alert>
            )}
        </>
    );
}