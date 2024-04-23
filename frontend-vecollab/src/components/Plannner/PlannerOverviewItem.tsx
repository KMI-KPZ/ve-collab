import Link from 'next/link';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import React, { useState } from 'react';
import SharePlanForm from './SharePlanForm';
import EditAccessList from './EditAccessList';
import SuccessAlert from '@/components/SuccessAlert';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { ISideProgressBarStates, ProgressState } from '@/interfaces/startingWizard/sideProgressBar';
import { MdCheck, MdShare, MdDelete, MdEdit } from 'react-icons/md';
import Timestamp from '../Timestamp';
import { useSession } from 'next-auth/react';
import { fetchGET } from '@/lib/backend';
import LoadingAnimation from '../LoadingAnimation';
import { PlanOverview } from '../planSummary/planOverview';
interface Props {
    plan: PlanPreview;
    deleteCallback: (planId: string) => Promise<void>;
    refetchPlansCallback: () => Promise<void>;
}

export default function PlannerOverviewItem({ plan, deleteCallback, refetchPlansCallback }: Props) {

    const { data: session } = useSession();

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

    const [isSummaryOpen, setSummaryOpen] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState<boolean>(false)
    const [planSummary, setPlanSummary] = useState<IPlan>()

    const handleCloseShareDialog = async () => {
        setIsShareDialogOpen(false);
        // refetch plans to have all up-to-date information without having to reload the page
        await refetchPlansCallback();
    };

    const completedProgress: { [key: string]:  ProgressState } = {
        name: ProgressState.completed
    }

    const isPlanProgressCompleted = (): boolean => {
        return Object.keys(completedProgress).every(k => plan.progress[k as keyof ISideProgressBarStates] == completedProgress[k] )
    }

    const openPlanSummary = () => {
        setSummaryOpen(true)
        setLoadingSummary(true)

        fetchGET(`/planner/get?_id=${plan._id}`, session?.accessToken)
        .then(data => {
            setPlanSummary(data.plan)
            setLoadingSummary(false)
        })
    }

    return (
        <>
            <div className='basis-1/12 px-3'>
                {isPlanProgressCompleted() ?<MdCheck /> : <></>}
            </div>
            <div className='grow py-2 px-3 font-normal text-base group hover:cursor-pointer' onClick={() => openPlanSummary()}>
                <div className='flex items-center'>
                <div className='font-bold whitespace-nowrap'>{plan.name}</div>
                {plan.author === session?.user.preferred_username && (
                    <div className='mx-2 flex text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button className='p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700' onClick={e => {
                            e.stopPropagation()
                            setIsShareDialogOpen(true);
                        }}><MdShare /></button>
                        <Link href={{
                            pathname: '/startingWizard/generalInformation/projectName',
                            query: { plannerId: plan._id }
                        }}>
                            <button className='p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700' onClick={e => e.stopPropagation()}><MdEdit /></button>
                        </Link>
                        <button className='p-2 rounded-full hover:bg-ve-collab-blue-light hover:text-gray-700' onClick={e => {
                            e.stopPropagation()
                            deleteCallback(plan._id)
                        }}><MdDelete /></button>
                    </div>
                )}
                </div>
            </div>
            <div className='basis-1/6 px-3 '>{plan.author}</div>
            <div className='basis-1/6 px-3 '><Timestamp timestamp={plan.creation_timestamp} className='text-sm' /></div>
            <div className='basis-1/6 px-3 '><Timestamp timestamp={plan.last_modified} className='text-sm' /></div>

            <Dialog isOpen={isShareDialogOpen} title={`Teilen`} onClose={handleCloseShareDialog}>
                <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                    <Tabs>
                        <div tabname="Neu">
                            <SharePlanForm
                                closeDialogCallback={handleCloseShareDialog}
                                planId={plan._id}
                                setSuccessPopupOpen={setSuccessPopupOpen}
                                setSuccessMessage={setSuccessMessage}
                            />
                        </div>
                        <div tabname="Verwalten">
                            <EditAccessList
                                closeDialogCallback={handleCloseShareDialog}
                                plan={plan}
                                setSuccessPopupOpen={setSuccessPopupOpen}
                                setSuccessMessage={setSuccessMessage}
                            />
                        </div>
                    </Tabs>
                </div>
            </Dialog>

            <Dialog isOpen={isSummaryOpen} title={`Zusammenfassung des Plans`} onClose={() => {
                setSummaryOpen(false)
                setPlanSummary(undefined)

            }}>
                <div className="w-[70vw] h-[60vh] overflow-y-auto content-scrollbar relative">
                    {loadingSummary
                        ? (<LoadingAnimation />)
                        : (
                            <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                                <div>
                                    <div className={'text-center font-bold text-4xl mb-2'}>{plan.name}</div>
                                </div>
                                <div className="flex w-full">
                                    <PlanOverview plan={planSummary!} />
                                </div>
                            </div>
                        )
                    }
                </div>
            </Dialog>

            {successPopupOpen && <SuccessAlert message={successMessage} />}
        </>
    );
}
