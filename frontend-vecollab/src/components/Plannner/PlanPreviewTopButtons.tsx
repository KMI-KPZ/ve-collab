import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { useSession } from 'next-auth/react';
import { HiOutlineShare, HiOutlineTrash } from 'react-icons/hi';

interface Props {
    plan: PlanPreview;
    openShareDialogCallback: () => void;
    deletePlanCallback: (planId: string) => Promise<void>;
}
export default function PlanPreviewTopButtons({
    plan,
    openShareDialogCallback,
    deletePlanCallback,
}: Props) {
    const { data: session } = useSession();

    return (
        <div className="absolute top-0 right-0 flex">
            {/* render share button only if user is the author */}
            {plan.author === session?.user.preferred_username && (
                <>
                    <button
                        className="p-2 flex justify-center items-center"
                        onClick={(e) => openShareDialogCallback()}
                    >
                        <HiOutlineShare />
                    </button>
                </>
            )}
            <button
                className="bg-gray-300 rounded-lg p-2 flex justify-center items-center"
                onClick={(e) => deletePlanCallback(plan._id)}
            >
                <HiOutlineTrash />
            </button>
        </div>
    );
}
