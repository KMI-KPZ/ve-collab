import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, SubmitHandler } from 'react-hook-form';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { MultiValue, ActionMeta } from 'react-select';
import CreatableSelect from 'react-select/creatable';

interface FormValues {
    globalGoals: string;
}

export default function GlobalGoals() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const { validateAndRoute } = useValidation();
    const [learningGoals, setLearningGoals] = useState<string[]>([]);

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
        setValue,
    } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            globalGoals: '',
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
                    if (data.plan.globalGoals !== null) {
                        setValue('globalGoals', data.plan.globalGoals);
                    }
                    setSteps(data.plan.steps);

                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
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
                        field_name: 'globalGoals',
                        value: data.globalGoals,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            globalGoals: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );
    };

    function handleChange(
        newValue: MultiValue<{ value: string; label: string }>,
        actionMeta: ActionMeta<{ value: string; label: string }>
    ): void {
        setLearningGoals(newValue.map((chosenOptions) => chosenOptions.value));
    }

    console.log(learningGoals);

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Welche Richtlernziele sollen im VE erreicht werden?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <CreatableSelect
                                isMulti
                                closeMenuOnSelect={false}
                                options={[
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
                                ]}
                                value={learningGoals.map((goal) => {
                                    return { value: goal, label: goal };
                                })}
                                onChange={handleChange}
                                formatCreateLabel={(inputValue) => `Sonstige: ${inputValue}`}
                            />
                            <div className="mx-7 mt-7 flex justify-center">
                                <select
                                    placeholder="Globalen Lehr-/Lernziele"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                    {...register('globalGoals')}
                                >
                                    <option value="Test">Test</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                </select>
                                <p className="text-red-600 pt-2">{errors?.globalGoals?.message}</p>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={() => {
                                        validateAndRoute(
                                            '/startingWizard/generalInformation/participatingCourses',
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
                                            '/startingWizard/generalInformation/targetGroups',
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
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
