import { VEPlanSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import LoadingAnimation from '../LoadingAnimation';

interface Props {
    chosenPlanId: string;
    setChosenPlanId: Dispatch<SetStateAction<string>>;
}

export default function PublicPlansSelect({ chosenPlanId, setChosenPlanId }: Props) {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);

    const [myPublicPlans, setMyPublicPlans] = useState<VEPlanSnippet[]>([
        {
            _id: '',
            name: '',
        },
    ]);

    // request all personal public plans for dropdown
    useEffect(() => {
        setLoading(true);
        // if session is not yet ready, don't make any requests, just wait for the next re-render
        if (status === 'loading') {
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(
                `/planner/get_public_of_user?username=${session.user.preferred_username}`,
                session?.accessToken
            ).then((data) => {
                setLoading(false);
                setMyPublicPlans(
                    data.plans.map((plan: any) => ({
                        _id: plan._id,
                        name: plan.name,
                    }))
                );
            });
        }
    }, [session, status]);
    return (
        <>
            {loading ? (
                <div className="my-8">
                    <LoadingAnimation />
                </div>
            ) : (
                <select
                    name="plan"
                    className="w-full border border-gray-500 rounded-lg h-12 p-2 bg-white"
                    value={chosenPlanId}
                    onChange={(e) => setChosenPlanId(e.target.value)}
                >
                    {myPublicPlans.map((plan, index) => (
                        <option key={`option_${index}`} value={plan._id}>
                            {plan.name}
                        </option>
                    ))}
                </select>
            )}
        </>
    );
}
