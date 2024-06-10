import LoadingAnimation from '@/components/LoadingAnimation';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import SideProgressBarSectionBroadPlanner from '@/components/VE-designer/SideProgressBarSectionBroadPlanner_REDESIGN';
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
import { SubmitHandler, useForm } from 'react-hook-form';
import Container from '@/components/Layout/container';
import WhiteBox from '@/components/Layout/WhiteBox';
import { MdKeyboardDoubleArrowRight } from 'react-icons/md';

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
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [error, setError] = useState<string>();

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
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<FormValues>({ mode: 'onChange' });

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
                    if (!data.plan) {
                        setError('Failed to fetch the requested Plan!')
                        return;
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                    setValue('name', data.plan.name, { shouldValidate: true });
                }
            );
        }
    }, [session, status, router, setValue]);

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

    if (error) {
        return (
            <>
                {error}
            </>
        )
    }

    return (
        <div className="bg-pattern-left-blue bg-no-repeat">
        <Container>
            <WhiteBox>


        <div className="flex ">

            <SideProgressBarSectionBroadPlanner
                progressState={sideMenuStepsProgress}
                handleValidation={handleSubmit(onSubmit)}
                isValid={true}
            />
                <div className="flex flex-col w-full mx-3 my-6">
                    <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <form className="gap-y-6 p-12 max-w-screen-2xl flex flex-row"
                            onSubmit={handleSubmit((data) =>
                                combinedSubmitRouteAndUpdate(
                                    data,
                                    '/ve-designer/partners'
                                )
                            )}
                        >
                            <div className="grow">
                                <div className={'font-bold text-2xl mb-12'}>
                                    Wie soll das Projekt heißen?
                                </div>
                                <div className="">
                                    <input
                                        type="text"
                                        placeholder="Name eingeben"
                                        className="min-w-60 border border-gray-300 rounded-md p-2"
                                        {...register('name', {
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
                                    <p className="text-red-600 pt-2">{errors.name?.message}</p>
                                </div>
                            </div>

                            <div className="">
                                {/* <div>
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg invisible"
                                    >
                                        Zurück
                                    </button>
                                </div> */}
                                    <button
                                        type="button"
                                        className="w-16 h-16 shadow bg-ve-collab-orange/75 text-white py-3 px-5 rounded-full hover:bg-ve-collab-orange"
                                        onClick={handleSubmit((data) =>
                                            combinedSubmitRouteAndUpdate(
                                                data,
                                                '/ve-designer/partners'
                                            )
                                        )}
                                        title='Weiter'
                                    >
                                        <MdKeyboardDoubleArrowRight size={25} />
                                    </button>
                            </div>

                        </form>
                    )}
                </div>

        </div>

        </WhiteBox>
        </Container>
        </div>
    );
}
