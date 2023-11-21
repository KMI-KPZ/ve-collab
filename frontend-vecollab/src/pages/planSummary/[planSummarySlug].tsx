import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';
import { PlanOverview } from '@/components/planSummary/planOverview';

// TODO nur lese rechte -> summary
// TODO https://github.com/KMI-KPZ/ve-collab/issues/41

export const showDataOrEmptySign = (data: any) => {
    if (data === null || data === undefined || data === '') {
        return '/';
    } else {
        return data;
    }
};

// authentication is required on this page
PlanSummarySlug.auth = true;
export default function PlanSummarySlug() {
    const router = useRouter();
    const { data: session } = useSession();
    const currentPlanId: string = router.query.planSummarySlug as string;
    const { data: plan, isLoading } = useGetPlanById(session!.accessToken, currentPlanId);

    return (
        <>
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>{plan.name}</div>
                        <div className={'text-center mb-10'}>Zusammenfassung des Plans</div>
                    </div>
                    <div className="flex w-full">
                        {isLoading ? <LoadingAnimation /> : <PlanOverview plan={plan} />}
                    </div>
                </div>
            </div>
        </>
    );
}
