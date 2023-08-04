import React from 'react';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';

interface FormValues {
    newContent: string;
}

export default function NewContent() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const { validateAndRoute } = useValidation();

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
        formState: { errors, isValid },
        handleSubmit,
        watch,
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            newContent: undefined,
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
                    if (data.plan.new_content === true || data.plan.new_content === false) {
                        setValue('newContent', data.plan.new_content.toString());
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router, setValue]);

    const onSubmit: SubmitHandler<FormValues> = async () => {
        const typedValue = watch('newContent') == null ? null : watch('newContent') === 'true';
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'new_content',
                        value: typedValue,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            new_content: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    return (
        <>
            <HeadProgressBarSection stage={0} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Werden Sie neue Inhalte für den VE erstellen und bestehende Teile
                                der Lehrveranstaltungen anpassen?
                            </div>
                            <div className={'mb-20'}></div>
                            <div className="mt-4 flex justify-center">
                                <div className="w-1/6">
                                    <div className="flex my-1">
                                        <div className="w-1/2">
                                            <label className="px-2 py-2">Ja</label>
                                        </div>
                                        <div className="w-1/2">
                                            <input
                                                {...register(`newContent`)}
                                                type="radio"
                                                value="true"
                                                className="border border-gray-500 rounded-lg p-2"
                                            />
                                            <p className="text-red-600 pt-2">
                                                {errors.newContent?.message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex my-1">
                                        <div className="w-1/2">
                                            <label className="px-2 py-2">Nein</label>
                                        </div>
                                        <div className="w-1/2">
                                            <input
                                                {...register(`newContent`)}
                                                type="radio"
                                                value="false"
                                                className="border border-gray-500 rounded-lg p-2"
                                            />
                                            <p className="text-red-600 pt-2">
                                                {errors.newContent?.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/languages',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Zurück
                                </button>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/courseFormat',
                                            router.query.plannerId,
                                            handleSubmit(onSubmit),
                                            isValid
                                        );
                                    }}
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={handleSubmit(onSubmit)}
                    isValid={isValid}
                />
            </div>
        </>
    );
}
