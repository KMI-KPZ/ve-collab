import { VEPlanSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import LoadingAnimation from '../common/LoadingAnimation';
import { useTranslation } from 'next-i18next';

interface Props {
    chosenPlanId?: string;
    setChosenPlanId: (id: string) => void;
}

PlansSelector.auth = true;
export default function PlansSelector({ chosenPlanId, setChosenPlanId }: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<VEPlanSnippet[]>([]);

    useEffect(() => {
        if (plans.length) return;
        setLoading(true);

        fetchGET('/planner/get_available?filter_access=own', session?.accessToken)
            .then((data) => {
                console.log({ data });
                if (!data.success) return;

                setPlans(
                    (data.plans as VEPlanSnippet[]).map((plan) => ({
                        _id: plan._id,
                        name: plan.name,
                    }))
                );
            })
            .finally(() => setLoading(false));
    }, [plans, session?.accessToken]);

    if (loading)
        return (
            <div className="my-8">
                <LoadingAnimation />
            </div>
        );

    if (!plans.length) return <div>{t('plans_nothing_matches')}</div>;

    return (
        <select
            name="plan"
            className="w-full border border-gray-500 rounded-lg h-12 p-2 bg-white"
            value={chosenPlanId}
            onChange={(e) => {
                console.log({ setChosenPlanId: e.target.value });

                setChosenPlanId(e.target.value);
            }}
        >
            {plans.map((plan, index) => (
                <option key={`option_${index}`} value={plan._id}>
                    {plan.name}
                </option>
            ))}
        </select>
    );
}
