import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { HiOutlineShare, HiOutlineTrash } from 'react-icons/hi';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import { useState } from 'react';
import SharePlanForm from './SharePlanForm';
import EditAccessList from './EditAccessList';
import SuccessAlert from '../profile/SuccessAlert';
import { RxArrowRight } from 'react-icons/rx';
import PlanPreviewInformation from './PlanPreviewInformation';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
interface Props {
    plan: PlanPreview;
    deleteCallback: (planId: string) => Promise<void>;
    refetchPlansCallback: () => Promise<void>;
}

export default function PlannerOverviewItem({ plan, deleteCallback, refetchPlansCallback }: Props) {
    const { data: session } = useSession();

    // sub components will use these setters to trigger the success popup display
    // because it won't render if triggered within the Dialog for some reason
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    
    const handleOpenShareDialog = () => {
        setIsShareDialogOpen(true);
    };
    const handleCloseShareDialog = () => {
        setIsShareDialogOpen(false);
        // refetch plans to have all up-to-date information without having to reload the page
        refetchPlansCallback();
    };

    return (
        <>
            <div className="m-2">
                <div className="rounded-lg shadow-md bg-gray-100 w-52 relative">
                    <PlanPreviewInformation plan={plan} />
                    <div className="absolute top-0 right-0 flex">
                        {/* render share button only if user is the author */}
                        {plan.author === session?.user.preferred_username && (
                            <>
                                <button
                                    className="p-2 flex justify-center items-center"
                                    onClick={(e) => handleOpenShareDialog()}
                                >
                                    <HiOutlineShare />
                                </button>
                            </>
                        )}
                        <button
                            className="bg-gray-300 rounded-lg p-2 flex justify-center items-center"
                            onClick={(e) => deleteCallback(plan._id)}
                        >
                            <HiOutlineTrash />
                        </button>
                    </div>
                    <Link
                        href={{
                            pathname: '/startingWizard/generalInformation/projectName',
                            query: { plannerId: plan._id },
                        }}
                    >
                        <button className="absolute bottom-0 right-0 bg-ve-collab-orange rounded-lg p-2 flex justify-center items-center">
                            <RxArrowRight color="white" />
                        </button>
                    </Link>
                </div>
            </div>
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
            {successPopupOpen && <SuccessAlert message={successMessage} />}
        </>
    );
}
