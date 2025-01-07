import { VEPlanSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import LoadingAnimation from '../common/LoadingAnimation';

interface Props {
    chosenPlanId: string;
    setChosenPlanId: Dispatch<SetStateAction<string>>;
}

PublicPlansSelect.auth = true;
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
        fetchGET(
            `/planner/get_public_of_user?username=${session!.user.preferred_username}`,
            session?.accessToken
        ).then((data) => {
            setLoading(false);
            const plans = data.plans
                .map((plan: any) => ({
                    _id: plan._id,
                    name: plan.name,
                }))
                .sort((a: any, b: any) => a.name.localeCompare(b.name));
            setMyPublicPlans(plans);
            // default select the first plan, otherwise it would be visible in the select, but value still null
            if (plans.length > 0) {
                setChosenPlanId(plans[0]._id);
            }
        });
    }, [session, setChosenPlanId]);
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
