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
import CreatableSelect from 'react-select/creatable';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import { Controller, FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import SideProgressBarSectionBroadPlannerWithReactHookForm from '@/components/StartingWizard/SideProgressBarSectionBroadPlannerWithReactHookForm';
import PopupSaveData from '@/components/StartingWizard/PopupSaveData';

export interface FormValues {
    learningGoals: { value: string; label: string }[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.learningGoals.every((goal) => {
        return goal.value === '' && goal.label === '';
    });
};

GlobalGoals.auth = true;
export default function GlobalGoals() {
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
            learningGoals: [],
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
                    setSteps(data.plan.steps);
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    methods.setValue(
                        'learningGoals',
                        data.plan.learning_goals.map((goals: string) => ({
                            value: goals,
                            label: goals,
                        }))
                    );
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
                            field_name: 'learning_goals',
                            value: data.learningGoals.map((goal) => goal.value),
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'progress',
                            value: {
                                ...sideMenuStepsProgress,
                                learning_goals: ProgressState.completed,
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

    const options: { value: string; label: string }[] = [
        {
            value: 'Förderung kritischen Denkens',
            label: 'Förderung kritischen Denkens',
        },
        {
            value: 'Förderung kreativen Denkens',
            label: 'Förderung kreativen Denkens',
        },
        {
            value: 'Förderung kollaborativen Arbeitens',
            label: 'Förderung kollaborativen Arbeitens',
        },
        {
            value: 'Förderung kommunikativer Fähigkeiten',
            label: 'Förderung kommunikativer Fähigkeiten',
        },
        {
            value: 'Förderung digitaler Kompetenzen',
            label: 'Förderung digitaler Kompetenzen',
        },
        {
            value: 'Förderung sozialer Kompetenzen',
            label: 'Förderung sozialer Kompetenzen',
        },
        {
            value: 'Förderung der kulturellen Kompetenz',
            label: 'Förderung der kulturellen Kompetenz',
        },
        {
            value: 'Förderung der Sprachkompetenz',
            label: 'Förderung der Sprachkompetenz',
        },
        {
            value: 'Förderung fachlicher Kompetenzen (Wissen, Fertigkeiten)',
            label: 'Förderung fachlicher Kompetenzen (Wissen, Fertigkeiten)',
        },
    ];

    function createableSelect(
        control: any,
        name: any,
        options: { value: string; label: string }[]
    ): JSX.Element {
        return (
            <Controller
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <CreatableSelect
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                        options={options}
                        isClearable={true}
                        isMulti
                        closeMenuOnSelect={false}
                        placeholder="Richtlernziele auswählen oder neue durch Tippen hinzufügen"
                    />
                )}
                control={control}
            />
        );
    }

    return (
        <FormProvider {...methods}>
            <PopupSaveData
                isOpen={isPopupOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: '/startingWizard/generalInformation/learningPlatform',
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
                                        Welche Richtlernziele sollen im VE erreicht werden?
                                        <Tooltip tooltipsText="Mehr zu Richtlernzielen findest du hier in den Selbstlernmaterialien …">
                                            <Link target="_blank" href={'/learning-material/top-bubble/Potenziale'}>
                                                <PiBookOpenText size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className={'text-center mb-20'}>optional</div>
                                    {createableSelect(methods.control, 'learningGoals', options)}
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/startingWizard/generalInformation/targetGroups'
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
                                                        '/startingWizard/generalInformation/veTopic'
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
