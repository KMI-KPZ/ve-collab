import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { RxMinus, RxPlus } from 'react-icons/rx';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { FiInfo } from 'react-icons/fi';
import { FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import PopupSaveData from '@/components/StartingWizard/PopupSaveData';
import SideProgressBarSectionBroadPlannerWithReactHookForm from '@/components/StartingWizard/SideProgressBarSectionBroadPlannerWithReactHookForm';

interface VeTopic {
    name: string;
}

interface FormValues {
    veTopics: VeTopic[];
}

Topics.auth = true;
export default function Topics() {
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
            veTopics: [{ name: '' }],
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
                    console.log(data.plan);
                    setLoading(false);

                    if (data.plan.topics.length > 0) {
                        methods.setValue(
                            'veTopics',
                            data.plan.topics.map((element: string) => ({
                                name: element,
                            }))
                        );
                    }

                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router, methods]);

    const { fields, append, remove } = useFieldArray({
        name: 'veTopics',
        control: methods.control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'topics',
                        value: data.veTopics.map((element) => element.name),
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            topics: ProgressState.completed,
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

    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/startingWizard/generalInformation/languages',
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
                            <form className="gap-y-6 w-full p-12 max-w-7xl items-center flex flex-col flex-grow justify-between">
                                <div>
                                    <div className="text-center font-bold text-4xl mb-2 relative">
                                        Zu welchem Thema / welchen Themen findet der VE statt?
                                        <Tooltip tooltipsText="Inspiration zu fachbezogenen Themen verschiedener Disziplinen findest du hier in den Selbstlernmaterialien …">
                                            <Link
                                                target="_blank"
                                                href={'/content/Beispiele%20aus%20der%20Praxis'}
                                            >
                                                <FiInfo size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className="text-center mb-20">optional</div>
                                    <div className="flex flex-col justify-center">
                                        {fields.map((topic, index) => (
                                            <div
                                                key={topic.id}
                                                className="mt-2 flex flex-col justify-center items-center"
                                            >
                                                <div className="flex justify-center items-center w-full mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Thema eingeben"
                                                        className="border border-gray-300 rounded-lg w-3/4 p-2 mr-2"
                                                        {...methods.register(
                                                            `veTopics.${index}.name`,
                                                            {
                                                                maxLength: {
                                                                    value: 500,
                                                                    message:
                                                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                                                },
                                                            }
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <RxMinus size={20} />
                                                    </button>
                                                </div>
                                                <p className="text-red-600 pt-2">
                                                    {
                                                        methods.formState.errors?.veTopics?.[index]
                                                            ?.name?.message
                                                    }
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center mt-4">
                                        <button
                                            className="p-4 bg-white rounded-3xl shadow-2xl"
                                            type="button"
                                            onClick={() => {
                                                append({
                                                    name: '',
                                                });
                                            }}
                                        >
                                            <RxPlus size={25} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) => {
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/startingWizard/generalInformation/globalGoals'
                                                );
                                            })}
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
                                                        '/startingWizard/generalInformation/languages'
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
                <SideProgressBarSectionBroadPlannerWithReactHookForm
                    progressState={sideMenuStepsProgress}
                    onSubmit={onSubmit}
                />
            </div>
        </FormProvider>
    );
}
