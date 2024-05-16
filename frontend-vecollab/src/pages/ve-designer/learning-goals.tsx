import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import CreatableSelect from 'react-select/creatable';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import { Controller, FormProvider, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import SideProgressBarWithReactHookForm from '@/components/VE-designer/SideProgressBarWithReactHookForm';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';
import WhiteBox from '@/components/Layout/WhiteBox';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';

export interface FormValues {
    majorLearningGoals: { value: string; label: string }[];
    individualLearningGoals: { username: string; learningGoal: string }[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return (
        formValues.majorLearningGoals.every((goal) => {
            return goal.value === '' && goal.label === '';
        }) &&
        formValues.individualLearningGoals.every((goal) => {
            return goal.learningGoal === '';
        })
    );
};

LearningGoals.auth = true;
export default function LearningGoals() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
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
            majorLearningGoals: [],
            individualLearningGoals: [],
        },
    });

    const { fields } = useFieldArray({
        name: 'individualLearningGoals',
        control: methods.control,
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
                    console.log(data);
                    setLoading(false);
                    setSteps(data.plan.steps);
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    methods.setValue(
                        'majorLearningGoals',
                        data.plan.major_learning_goals.map((goals: string) => ({
                            value: goals,
                            label: goals,
                        }))
                    );
                    methods.setValue(
                        'individualLearningGoals',
                        data.plan.individual_learning_goals.map((goal: any) => ({
                            username: goal.username,
                            learningGoal: goal.learning_goal,
                        }))
                    );

                    // fetch profile snippets to be able to display the full name instead of username only
                    fetchPOST(
                        '/profile_snippets',
                        { usernames: [...data.plan.partners, data.plan.author] },
                        session.accessToken
                    ).then((snippets: BackendProfileSnippetsResponse) => {
                        let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
                        snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                            partnerSnippets[element.username] = element;
                        });
                        setPartnerProfileSnippets(partnerSnippets);
                        setLoading(false);
                    });
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
                            field_name: 'major_learning_goals',
                            value: data.majorLearningGoals.map((goal) => goal.value),
                        },
                        {
                            plan_id: router.query.plannerId,
                            field_name: 'individual_learning_goals',
                            value: data.individualLearningGoals.map((goal) => ({
                                username: goal.username,
                                learning_goal: goal.learningGoal,
                            })),
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
                        pathname: '/ve-designer/methodical-approach',
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
                                        1. Welche fachlichen Lernziele sollen im VE erreicht werden?
                                        <Tooltip tooltipsText="Mehr zu Richtlernzielen findest du hier in den Selbstlernmaterialien …">
                                            <Link
                                                target="_blank"
                                                href={'/learning-material/top-bubble/Potenziale'}
                                            >
                                                <PiBookOpenText size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className={'text-center mb-4'}>optional</div>
                                    <div className="flex flex-wrap justify-center">
                                        {fields.map((individualLearningGoalPerPartner, index) => (
                                            <div
                                                key={individualLearningGoalPerPartner.id}
                                                className="flex justify-center mx-2"
                                            >
                                                <WhiteBox className="w-fit h-fit">
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-lg mb-4 text-center">
                                                            {partnerProfileSnippets[
                                                                individualLearningGoalPerPartner
                                                                    .username
                                                            ]
                                                                ? partnerProfileSnippets[
                                                                      individualLearningGoalPerPartner
                                                                          .username
                                                                  ].first_name +
                                                                  ' ' +
                                                                  partnerProfileSnippets[
                                                                      individualLearningGoalPerPartner
                                                                          .username
                                                                  ].last_name
                                                                : individualLearningGoalPerPartner.username}
                                                        </div>
                                                        <textarea
                                                            rows={3}
                                                            className="border border-gray-400 rounded-lg p-2 ml-2 w-96"
                                                            {...methods.register(
                                                                `individualLearningGoals.${index}.learningGoal`
                                                            )}
                                                            placeholder={
                                                                'Beschreibe die individuellen Lernziele von ' +
                                                                individualLearningGoalPerPartner.username
                                                            }
                                                        ></textarea>
                                                    </div>
                                                </WhiteBox>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-12">
                                    <div className={'text-center font-bold text-4xl mb-2 relative'}>
                                        2. Welche weitere übergeordnete Lernziele werden verfolgt?
                                        <Tooltip tooltipsText="Mehr zu Richtlernzielen findest du hier in den Selbstlernmaterialien …">
                                            <Link
                                                target="_blank"
                                                href={'/learning-material/top-bubble/Potenziale'}
                                            >
                                                <PiBookOpenText size={30} color="#00748f" />
                                            </Link>
                                        </Tooltip>
                                    </div>
                                    <div className={'text-center mb-10'}>optional</div>

                                    {createableSelect(
                                        methods.control,
                                        'majorLearningGoals',
                                        options
                                    )}
                                </div>
                                <div className="flex justify-between w-full max-w-xl">
                                    <div>
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                            onClick={methods.handleSubmit((data) =>
                                                combinedSubmitRouteAndUpdate(
                                                    data,
                                                    '/ve-designer/target-groups'
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
                                                        '/ve-designer/methodical-approach'
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
