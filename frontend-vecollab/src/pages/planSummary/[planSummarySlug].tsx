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
                                <div className="text-xl font-semibold mb-4">Eigenschaften</div>
                                <ul className="grid grid-cols-4 gap-5">
                                    <span className="font-semibold pr-5">Partners:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.partners.map((partner, index) => (
                                            <li key={index}> {partner} </li>
                                        ))}
                                    </ul>
                                    <span className="font-semibold pr-5">Externe Beteidigte:</span>
                                    <ul className="flex flex-col space-y-2 col-span-3">
                                        {plan.involved_parties.map((party, index) => (
                                            <li key={index}> {party} </li>
                                        ))}
                                    </ul>
                                    <span className="font-semibold pr-5">Institutionen:</span>
                                    <div className="grid grid-cols-2 col-span-3">
                                        {plan.institutions.map((institution, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-2 pb-4 pr-10"
                                            >
                                                <ul className="space-y-1 pr-3">
                                                    <li> Name </li>
                                                    <li> Schulform </li>
                                                    <li> Land </li>
                                                    <li> Abteilungsname </li>
                                                    <li> Beteidigte Studiengänge </li>
                                                </ul>
                                                <ul className="space-y-1">
                                                    <li>{institution.name} </li>
                                                    <li>{institution.school_type} </li>
                                                    <li>{institution.country} </li>
                                                    <li>{institution.departments} </li>
                                                    <li>{institution.academic_courses} </li>
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
