import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { PlanOverview } from '@/components/planSummary/planOverview';
import Link from 'next/link';
import { MdEdit } from 'react-icons/md';
import { useSession } from 'next-auth/react';

PlanSummary.auth = true;
export default function PlanSummary() {
    const { data: session } = useSession();

    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.planId as string);

    const username = session?.user.preferred_username;

    if (!isLoading && !plan) {
        return <>Plan not found</>
    }

    return (
        <>
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue-small bg-no-repeat">
                <div className="container mx-auto mb-14 px-5 p-12">
                    <div className="mb-6">
                        <div className={'flex font-bold text-4xl mb-2'}>
                            {plan.name}
                            {username && (
                                <>{plan.write_access.includes(username) && (
                                    <Link
                                        className='inline text-xl m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20'
                                        href={{
                                            pathname: '/ve-designer/name',
                                            query: { plannerId: plan._id },
                                        }}
                                    >
                                        <MdEdit className="inline" /> Bearbeiten
                                    </Link>
                                )}</>
                            )}
                        </div>
                        <div className={'text-gray-500 text-xl'}>
                            Zusammenfassung des Plans
                        </div>
                    </div>
                    <div className="flex w-full">
                            {isLoading ? <LoadingAnimation /> : <PlanOverview plan={plan} />}
                    </div>
                </div>
            </div>
        </>
    );
}