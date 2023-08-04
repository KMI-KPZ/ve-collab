import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, SubmitHandler } from 'react-hook-form';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';

interface FormData {
    topic: string;
}

export default function Topic() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const { validateAndRoute } = useValidation();

    const {
        watch,
        register,
        handleSubmit,
        formState: { errors, isValid },
        setValue,
    } = useForm<FormData>({ mode: 'onChange' });

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
                    setValue('topic', data.plan.topic);
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, setValue, router]);

    const onSubmit: SubmitHandler<FormData> = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    { plan_id: router.query.plannerId, field_name: 'topic', value: watch('topic') },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            topic: ProgressState.completed,
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
                                zu welchem Thema soll der VE stattfinden?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="m-7 flex justify-center">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Thema eingeben"
                                        className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                        {...register('topic', {
                                            maxLength: {
                                                value: 50,
                                                message:
                                                    'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                                            },
                                            pattern: {
                                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                                message:
                                                    'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?-',
                                            },
                                        })}
                                    />
                                    <p className="text-red-600 pt-2">{errors.topic?.message}</p>
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
                                            '/startingWizard/generalInformation/targetGroups',
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
                                    type="submit"
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
