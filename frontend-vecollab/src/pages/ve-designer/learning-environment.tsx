import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';
import SideProgressBarWithReactHookForm from '@/components/VE-designer/SideProgressBarWithReactHookForm';

interface FormValues {
    learningEnv: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.learningEnv === '';
};

LearningEnvironment.auth = true;
export default function LearningEnvironment() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const methods = useForm<FormValues>({
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
            router.push('/plans');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data.plan.learning_env !== null) {
                        methods.setValue('learningEnv', data.plan.learning_env);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router, methods]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (!areAllFormValuesEmpty(data)) {
            await fetchPOST(
                '/planner/update_fields',
                {
                    update: [
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'learning_env',
                            value: data.learningEnv,
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
        }
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
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/ve-designer/checklist',
                        query: {
                            plannerId: router.query.plannerId,
                        },
                    });
                }}
                handleCancel={() => setIsPopupOpen(false)}
            />
            <div className="flex bg-pattern-left-blue-small bg-no-repeat">
                <div className="flex flex-grow justify-center">
                    <div className="flex flex-col">
                        <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-between">
                                <div>
                                    <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                        In welcher digitalen Lernumgebung findet der VE statt?
                                        <Tooltip tooltipsText="Mehr zu LMS findest du hier in den Selbstlernmaterialien …">
                                            <Link
                                                target="_blank"
                                                href={'/learning-material/right-bubble/Digitale%20Medien%20&%20Werkzeuge'}
                                            >
                                                <PiBookOpenText size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    <div className="mt-4 flex flex-col justify-center items-center">
                                        <textarea
                                            rows={5}
                                            placeholder="Lernumgebung beschreiben"
                                            className="border border-gray-300 rounded-lg w-3/4 p-2"
                                            {...methods.register('learningEnv', {
                                                maxLength: {
                                                    value: 500,
                                                    message:
                                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                                },
                                            })}
                                        />
                                        <p className="text-red-600 pt-2">
                                            {methods.formState.errors?.learningEnv?.message}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/ve-designer/teaching-formats'
                                                )
                                            )}
                                        >
                                            Zurück
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit(
                                                (data) => {
                                                    combinedSubmitRouteAndUpdate(
                                                        data,
                                                        '/ve-designer/checklist'
                                                    );
                                                },
                                                async () => setIsPopupOpen(true)
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
                <SideProgressBarWithReactHookForm
                    progressState={sideMenuStepsProgress}
                    onSubmit={onSubmit}
                />
            </div>
        </FormProvider>
    );
}
