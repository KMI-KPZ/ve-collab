import { useSession } from 'next-auth/react';
import SmallGreyText from '@/components/SmallGreyText';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import Timestamp from '@/components/Timestamp';

interface Props {
    plan: PlanPreview;
}

export default function PlanPreviewInformation({ plan }: Props) {
    const { data: session } = useSession();
    return (
        <div className="mx-4 my-7 overflow-clip">
            <h2 className="text-xl font-bold leading-tight text-gray-800">{plan.name}</h2>
            {plan.author === session?.user.preferred_username ? (
                <SmallGreyText text={plan.author} />
            ) : (
                <SmallGreyText text={<>freigegeben von {plan.author}</>} />
            )}
            <div className="mt-3">
                <SmallGreyText text="Erstellt:" />
                <Timestamp timestamp={plan.creation_timestamp} className='text-sm' />
            </div>
            <div className="mt-3">
                <SmallGreyText text="Zuletzt geändert:" />
                <Timestamp timestamp={plan.last_modified} className='text-sm' />
            </div>
        </div>
    );
}
