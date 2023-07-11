import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';

interface FormValues {
    learningEnv: string;
}

export default function LearningEnvironment() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
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

    const {
        register,
        formState: { errors },
        handleSubmit,
        watch,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            learningEnv: '',
        },
    });

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
                    if (data.plan.learning_env !== null) {
                        setValue('learningEnv', data.plan.learning_env);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const onSubmit: SubmitHandler<FormValues> = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'learning_env',
                        value: watch('learningEnv'),
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            learning_env: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
        await router.push({
            pathname: '/startingWizard/generalInformation/tools',
            query: { plannerId: router.query.plannerId },
        });
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                    >
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Was ist die digitale Lernumgebung?
                            </div>
                            <div className={'text-center '}>optional</div>
                            <div className={'text-center mb-20'}>
                                Wo können die Infos/Aufgaben für die Studiernden zur Verfügung
                                gestellt und umgesetzt werden?
                            </div>
                            <div className="mt-4 flex justify-center">
                                <textarea
                                    rows={5}
                                    placeholder="z.B. Moodle, ..."
                                    className="border border-gray-500 rounded-lg w-3/4 p-2"
                                    {...register('learningEnv', {
                                        maxLength: {
                                            value: 500,
                                            message:
                                                'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                        },
                                    })}
                                />
                                <p className="text-red-600 pt-2">{errors?.learningEnv?.message}</p>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/courseFormat',
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
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection progressState={sideMenuStepsProgress} />
            </div>
        </>
    );
}
