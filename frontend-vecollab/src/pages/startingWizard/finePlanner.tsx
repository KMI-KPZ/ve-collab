import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import Stage from '@/components/StartingWizard/FinePlanner/Stage';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
} from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep, ITask } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { generateFineStepLinkTopMenu } from '@/pages/startingWizard/generalInformation/courseFormat';

export interface IStep {
    _id?: string;
    timestamp_from: string;
    timestamp_to: string;
    name: string;
    workload: number;
    social_form: string;
    learning_env: string;
    ve_approach: string;
    tasks: ITask[];
    evaluation_tools: string[];
    attachments?: string[];
    custom_attributes?: Record<string, string>;
}

export default function FinePlanner() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [linkFineStepTopMenu, setLinkFineStepTopMenu] = useState<string>(
        '/startingWizard/finePlanner'
    );

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
                    if (data.plan.steps?.length > 0) {
                        setSteps(data.plan.steps);
                    }
                    setLinkFineStepTopMenu(generateFineStepLinkTopMenu(data.plan.steps));
                }
            );
        }
    }, [session, status, router]);

    return (
        <>
            <HeadProgressBarSection stage={2} linkFineStep={linkFineStepTopMenu} />
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
