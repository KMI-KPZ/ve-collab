import LoadingAnimation from '@/components/LoadingAnimation';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import SideProgressBarWithReactHookFormWithoutPopUp from '@/components/VE-designer/SideProgressBarWithReactHookFormWithoutPopUp';

interface FormValues {
    name: string;
}

EssentialInformation.auth = true;
export default function EssentialInformation() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [author, setAuthor] = useState<string>('');
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

    const methods = useForm<FormValues>({ mode: 'onChange' });

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/plans');
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
                    setAuthor(data.plan.author);
                    methods.setValue('name', data.plan.name, { shouldValidate: true });
                }
            );
        }
    }, [session, status, router, methods]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'name',
                        value: data.name,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            name: ProgressState.completed,
                        },
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'partners',
                        value: [author],
                    },
                ],
            },
            session?.accessToken
        );
    };

    const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
        onSubmit(data);
        await router.push({
            pathname: url,
            query: { plannerId: router.query.plannerId },
        });
    };

    return (
        <FormProvider {...methods}>
            <div className="flex bg-pattern-left-blue-small bg-no-repeat">
                <div className="flex flex-grow justify-center">
                    <div className="flex flex-col">
                        <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-between">
                                <div className="flex-grow">
                                    <div className={'text-center font-bold text-4xl mb-24'}>
                                        Wie soll das Projekt heißen?
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <input
                                            type="text"
                                            placeholder="Name eingeben"
                                            className="border border-gray-300 rounded-md p-2 w-full"
                                            {...methods.register('name', {
                                                required: {
                                                    value: true,
                                                    message: 'Bitte gebe deiner VE einen Namen.',
                                                },
                                                maxLength: {
                                                    value: 50,
                                                    message:
                                                        'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                                },
                                                pattern: {
                                                    value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                                    message:
                                                        'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?,-',
                                                },
                                            })}
                                        />
                                        <p className="text-red-600 pt-2">
                                            {methods.formState.errors.name?.message}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex w-full justify-between">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg invisible"
                                        >
                                            Zurück
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/ve-designer/partners'
                                                )
                                            )}
                                        >
                                            Weiter
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                <SideProgressBarWithReactHookFormWithoutPopUp
                    progressState={sideMenuStepsProgress}
                    onSubmit={onSubmit}
                />
            </div>
        </FormProvider>
    );
}
