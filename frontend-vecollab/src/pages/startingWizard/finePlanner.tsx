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
                }
            );
        }
    }, [session, status, router]);

    return (
        <>
            <HeadProgressBarSection stage={2} />
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <div>
                        {steps.map((step: IFineStep) => (
                            <div key={step._id}>
                                <Link
                                    href={{
                                        pathname: `/startingWizard/fineplanner/${encodeURIComponent(
                                            step.name
                                        )}`,
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    {step.name}{' '}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
