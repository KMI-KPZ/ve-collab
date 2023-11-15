import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';
import ViewAttributes from '@/components/planSummary/ViewAttributes';
import ViewFinestep from '@/components/planSummary/ViewFinestep';

// TODO Bei Etappe: Zwischen EtappenName und Facts eine HR einfügen

// TODO Breite anpassen bei an und aus -> feste Breite

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
                    <div className="flex flex-wrap">
                        {isLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <div className="bg-white rounded-lg p-4">
                                <ViewAttributes plan={plan} />
                                <hr className="h-px my-10 bg-gray-400 border-0" />
                                <div className="text-2xl font-semibold mb-4 ml-4">Etappen</div>
                                {plan.steps.map((fineStep, index) => (
                                    <ViewFinestep key={index} fineStep={fineStep} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
