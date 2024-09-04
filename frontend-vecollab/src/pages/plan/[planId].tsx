import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Link from 'next/link';
import { MdEdit, MdOutlineFileDownload } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { GiSadCrab } from 'react-icons/gi';
import { PlanSummary } from '@/components/planSummary/PlanSummary';

Plan.auth = true;
export default function Plan() {
    const { data: session } = useSession();

    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.planId as string);

    const username = session?.user.preferred_username;

    const Wrapper = ({ children }: { children: JSX.Element }) => {
        return (
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue-small bg-no-repeat">
                <div className="container mx-auto mb-14 px-5 p-12">{children}</div>
            </div>
        );
    };

    if (!isLoading && !plan) {
        return (
            <Wrapper>
                <div className="flex flex-col items-center justify-center font-bold">
                    <div className="flex items-center">
                        <GiSadCrab size={60} className="m-4" />
                        <div className="text-xl text-slate-900">
                            Dieser Plan wurde nicht gefunden.
                        </div>
                    </div>
                    <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
                        <Link href="/plans">Zurück zur Übersicht</Link>
                    </button>
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            {isLoading ? (
                <LoadingAnimation />
            ) : (
                <>
                    <div className="mb-6">
                        <div className={'flex justify-between font-bold text-4xl mb-2'}>
                            <h1>{plan.name}</h1>
                            <div className='flex'>
                                {username && (
                                    <>
                                        {plan.write_access.includes(username) && (
                                            <Link
                                                className="inline text-xl m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                                                href={{
                                                    pathname: '/ve-designer/name',
                                                    query: { plannerId: plan._id },
                                                }}
                                            >
                                                <MdEdit className="inline" /> Bearbeiten
                                            </Link>
                                        )}
                                    </>
                                )}
                                <Link
                                    className="inline text-xl m-4 p-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                                    href={{
                                        pathname: `/api/pdf-plan`,
                                        query: { planId: plan._id },
                                    }}
                                >
                                    <MdOutlineFileDownload className="inline" /> Herunterladen
                                </Link>
                            </div>
                        </div>
                        <div className={'text-gray-500 text-xl'}>Zusammenfassung des Plans</div>
                    </div>
                    <div className="flex w-full">
                        <PlanSummary plan={plan} />
                    </div>
                </>
            )}
        </Wrapper>
    );
}
