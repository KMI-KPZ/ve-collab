import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';

export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [steps, setSteps] = useState<IFineStep[]>([]);

    // check for session errors and trigger the login flow if necessary
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
            <HeadProgressBarSection stage={2} linkFineStep={steps[0]?.name} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <div>
                        <div className=" flex justify-center font-bold text-xl mt-32 mb-20">
                            Bitte legen Sie zuerst grobe Schritte fest bevor Sie mit der Feinplanung
                            fortsetzen.
                        </div>
                        <Link
                            className="flex justify-center font-bold text-xl m-2 bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                            href={{
                                pathname: '/startingWizard/broadPlanner',
                                query: { plannerId: router.query.plannerId },
                            }}
                        >
                            Etappenplaner
                        </Link>
                        <Link
                            className="flex justify-center font-bold text-xl m-2 bg-gray-400 text-white py-3 px-5 rounded-lg"
                            href={{
                                pathname: '/startingWizard/finish',
                                query: { plannerId: router.query.plannerId },
                            }}
                        >
                            Ohne Etappen Fortfahren
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}
