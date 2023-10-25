import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';

// authentication is required on this page
PlanSummarySlug.auth = true;
export default function PlanSummarySlug() {
    const router = useRouter();
    const { data: session } = useSession();
    const currentPlanId: string = router.query.planSummarySlug as string;
    const {
        data: plan,
        isLoading,
        error,
        mutate,
    } = useGetPlanById(session!.accessToken, currentPlanId);

    console.log(plan);

    return (
        <>
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>{plan.name}</div>
                        <div className={'text-center mb-20'}>Zusammenfassung des Plans</div>
                    </div>
                    <div className="flex flex-wrap">
                        {isLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <div className="bg-white rounded-lg p-4">
                                <div className="text-xl font-semibold mb-4">Eigenschaften</div>
                                <ul>
                                    <li className="flex mb-2">
                                        <span className="font-semibold pr-5">Partners:</span>
                                        <ul className="flex flex-col space-y-2">
                                            {plan.partners.map((partner, index) => (
                                                <li key={index}> {partner} </li>
                                            ))}
                                        </ul>
                                    </li>
                                    <li className="flex mb-2">
                                        <span className="font-semibold pr-5">
                                            Externe Beteidigte:
                                        </span>
                                        <ul className="flex flex-col space-y-2">
                                            {plan.involved_parties.map((party, index) => (
                                                <li key={index}> {party} </li>
                                            ))}
                                        </ul>
                                    </li>
                                    <li className="mb-2">
                                        <span className="font-semibold">Attribut 3:</span> Wert 3
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
