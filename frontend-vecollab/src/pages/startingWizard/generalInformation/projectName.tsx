import LoadingAnimation from '@/components/LoadingAnimation';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { z } from 'zod';

const vaidationSchema = z
    .string()
    .max(40, { message: 'Der Name darf maximal 40 Zeichen lang sein' })
    .min(1, { message: 'Bitte gib den Plan einen Namen' });

export default function EssentialInformation() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [planName, setPlanName] = useState<string>('');
    const [errors, setErrors] = useState<string[]>();

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
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                    setPlanName(data.plan.name);
                }
            );
        }
    }, [session, status, router]);

    const handleSubmit = async (e: React.MouseEvent, routePath: string) => {
        e.preventDefault();
        setLoading(true);
        const validated = vaidationSchema.safeParse(planName);
        if (validated.success) {
            await fetchPOST(
                '/planner/update_fields',
                {
                    update: [
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'name',
                            value: planName,
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'progress',
                            value: {
                                ...sideMenuStepsProgress,
                                name: ProgressState.completed,
                            },
                        },
                    ],
                },
                session?.accessToken
            );
            await router.push({
                pathname: routePath,
                query: { plannerId: router.query.plannerId },
            });
        } else {
            const formatted = validated.error.format();
            setErrors(formatted._errors);
        }
        setLoading(false);
    };

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-20'}>
                                Wie soll das Projekt heißen?
                            </div>
                            <div className="m-7 flex justify-center">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Name eingeben"
                                        className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                        value={planName}
                                        onChange={(e) => setPlanName(e.target.value)}
                                    />
                                    {errors && (
                                        <div className="text-red-500 text-sm">
                                            {errors.map((error, index) => (
                                                <div key={index}>{error}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <button
                                type="button"
                                className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg invisible"
                            >
                                Zurück
                            </button>
                            <button
                                type="submit"
                                className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                onClick={(e: React.MouseEvent) =>
                                    handleSubmit(e, '/startingWizard/generalInformation/partners')
                                }
                            >
                                Weiter
                            </button>
                        </div>
                    </form>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={() => {}}
                    isValid={true}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
