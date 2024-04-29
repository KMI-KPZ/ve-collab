import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { fetchGET, useGetPlanById } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { PlanOverview } from '@/components/planSummary/planOverview';
import LoadingAnimation from '@/components/LoadingAnimation';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';

Finished.auth = true;
export default function Finished() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [, setLoading] = useState(false);

    const { data: plan, isLoading } = useGetPlanById(router.query.plannerId as string);
    const [steps, setSteps] = useState<IFineStep[]>([]);

    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router]);
    return (
        <>
            <HeadProgressBarSection stage={3} linkFineStep={steps[0]?.name} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>Fertig</div>
                        <div className={'text-center mb-10'}>
                            Herzlichen Glückwunsch, du hast den VE erfolgreich geplant!
                        </div>
                    </div>
                    {isLoading ? <LoadingAnimation /> : <PlanOverview plan={plan} />}
                    <div className="flex justify-around w-full mt-10">
                        <div>
                            <Link
                                href={{
                                    pathname: `/ve-designer/step-data/${encodeURIComponent(
                                        steps[0]?.name
                                    )}`,
                                    query: { plannerId: router.query.plannerId },
                                }}
                            >
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={'/overviewProjects'}>
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg mr-2"
                                >
                                    Weiter zur Übersicht
                                </button>
                            </Link>
                            <Link
                                href={{
                                    pathname: `/ve-designer/post-process`,
                                    query: { plannerId: router.query.plannerId },
                                }}
                            >
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg ml-2"
                                >
                                    zur Nachbearbeitung
                                </button>
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
