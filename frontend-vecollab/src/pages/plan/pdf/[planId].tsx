import React from 'react';
import { useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { PlanOverview } from '@/components/planSummary/planOverview';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { GiSadCrab } from 'react-icons/gi';

// This is the component that gets rendered into the PDF of a plan

// TODO: no header, no footer, open all accordions, optimize for print (media css if necessary)

PlanSummaryPDF.auth = true;
export default function PlanSummaryPDF() {
    const { data: session } = useSession();

    const router = useRouter();
    const { data: plan, isLoading } = useGetPlanById(router.query.planId as string);

    const Wrapper = ({children}: {children: JSX.Element}) => {
        return (
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue-small bg-no-repeat">
                <div className="container mx-auto mb-14 px-5 p-12">{children}</div>
            </div>
        );
    }

    if (!isLoading && !plan) {
        return <Wrapper>
            <div className="flex flex-col items-center justify-center font-bold">
                <div className="flex items-center">
                    <GiSadCrab size={60} className="m-4" />
                    <div className="text-xl text-slate-900">Dieser Plan wurde nicht gefunden.</div>
                </div>
                <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
                    <Link href="/plans">Zurück zur Übersicht</Link>
                </button>
            </div>
        </Wrapper>
    }

    return (
        <Wrapper>
            {isLoading
                ? <LoadingAnimation />
                : (<>
                    <div className="mb-6">
                        <div className={'flex justify-between font-bold text-4xl mb-2'}>
                            <h1>{plan.name}</h1>
                            
                        </div>
                        <div className={'text-gray-500 text-xl'}>
                            Zusammenfassung des Plans
                        </div>
                    </div>
                    <div className="flex w-full">
                        <PlanOverview plan={plan} />
                    </div>
                </>)
            }
        </Wrapper>
    );
}