import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
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
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { RxMinus, RxPlus } from 'react-icons/rx';

export interface FormValues {
    majorLearningGoals: MajorLearningGoals[];
    individualLearningGoals: IndividualLearningGoal[];
    topics: Topic[];
}

interface Topic {
    name: string;
}

interface MajorLearningGoals {
    value: string;
    label: string;
}

interface IndividualLearningGoal {
    username: string;
    learningGoal: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return (
        formValues.majorLearningGoals.every((goal) => {
            return goal.value === '' && goal.label === '';
        }) &&
        formValues.individualLearningGoals.every((goal) => {
            return goal.learningGoal === '' || goal.learningGoal === null;
        })
    );
};

LearningGoals.auth = true;
export default function LearningGoals() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);

    const prevpage = '/ve-designer/target-groups'
    const nextpage = '/ve-designer/methodology'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            majorLearningGoals: [],
            individualLearningGoals: [],
            topics: [{ name: '' }],
        },
    });

    const { fields: fieldsLearnings } = useFieldArray({
        name: 'individualLearningGoals',
        control: methods.control,
    });

    const {
        fields: fieldsTopics,
        append: appendTopic,
        remove: removeTopic
    } = useFieldArray({
        name: 'topics',
        control: methods.control,
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        methods.setValue(
            'majorLearningGoals',
            plan.major_learning_goals.map((goals: string) => ({
                value: goals,
                label: goals,
            }))
        );
        methods.setValue(
            'individualLearningGoals',
            plan.individual_learning_goals.map((goal: any) => ({
                username: goal.username,
                learningGoal: goal.learning_goal,
            }))
        );
        if (plan.topics.length > 0) {
            methods.setValue(
                'topics',
                plan.topics.map((element: string) => ({
                    name: element,
                }))
            );
        }
        if (Object.keys(plan.progress).length) {
            setSideMenuStepsProgress(plan.progress)
        }

        // fetch profile snippets to be able to display the full name instead of username only
        fetchPOST(
            '/profile_snippets',
            { usernames: [...plan.partners, plan.author] },
            session?.accessToken
        ).then((snippets: BackendProfileSnippetsResponse) => {
            setUsersFirstLastNames(snippets.user_snippets);
        });
    }, [methods, session]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data)) return

        return [
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
                field_name: 'topics',
                value: data.topics.map((element) => element.name),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    learning_goals: ProgressState.completed,
                    topics: ProgressState.completed,
                },
            },
        ]
    };

    const findPartnerFirstAndLastName = (username: string): string => {
        const findUser = usersFirstLastNames.find(
            (backendUserSnippet: BackendUserSnippet) => username === backendUserSnippet.username
        );
        if (findUser) {
            return findUser.first_name + ' ' + findUser.last_name;
        } else {
            return username;
        }
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

    const renderTopics = () => {
        return (<>
            <div className="flex flex-col ">
                {fieldsTopics.map((topic, index) => (
                    <div
                        key={topic.id}
                        className="mt-2 flex flex-col  w-1/2"
                    >
                        <div className="flex  grow mt-2">
                            <input
                                type="text"
                                placeholder="Thema eingeben"
                                className="border border-gray-300 rounded-lg w-3/4 p-2 mr-2"
                                {...methods.register(
                                    `topics.${index}.name`,
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
                                onClick={() => removeTopic(index)}
                            >
                                <RxMinus size={20} />
                            </button>
                        </div>
                        <p className="text-red-600 pt-2">
                            {
                                methods.formState.errors?.topics?.[index]
                                    ?.name?.message
                            }
                        </p>
                    </div>
                ))}
            </div>
            <div className=" mt-4">
                <button
                    className="p-2 bg-white rounded-full shadow"
                    type="button"
                    onClick={() => {
                        appendTopic({
                            name: '',
                        });
                    }}
                >
                    <RxPlus size={25} />
                </button>
            </div>
        </>);
    }

    return (
        <Wrapper
            title="Lernziele & Themen"
            subtitle='1. Welche fachlichen Lernziele sollen im VE erreicht werden?'
            tooltip={{text: 'Mehr zu Richtlernzielen findest du hier in den Selbstlernmaterialien …', link: '/learning-material/top-bubble/Potenziale'}}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div>
                <div className="flex flex-wrap">
                    {fieldsLearnings.map((individualLearningGoalPerPartner, index) => (
                        <div
                            key={individualLearningGoalPerPartner.id}
                            className="flex mx-2"
                        >
                            <div className="shadow rounded p-2 w-fit h-fit">
                                <div className="flex flex-col">
                                    <div className="font-bold text-lg mb-4 text-center">
                                        {findPartnerFirstAndLastName(
                                            individualLearningGoalPerPartner.username
                                        )}
                                    </div>
                                    <textarea
                                        rows={3}
                                        className="border border-gray-400 rounded-lg p-2 ml-2 w-96"
                                        {...methods.register(
                                            `individualLearningGoals.${index}.learningGoal`
                                        )}
                                        placeholder={
                                            'Beschreibe die individuellen Lernziele von ' +
                                            findPartnerFirstAndLastName(
                                                individualLearningGoalPerPartner.username
                                            )
                                        }
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-12">
                <div className={'flex justify-between items-center text-slate-600 text-xl mb-2 relative'}>
                    2. Welche weitere übergeordnete Lernziele werden verfolgt?
                    <Tooltip tooltipsText="Mehr zu Richtlernzielen findest du hier in den Selbstlernmaterialien …">
                        <Link
                            target="_blank"
                            href={'/learning-material/top-bubble/Potenziale'}
                            className='rounded-full shadow hover:bg-gray-50 p-2 mx-2'
                        >
                            <PiBookOpenText size={30} color="#00748f" />
                        </Link>
                    </Tooltip>
                </div>

                <div className='w-1/2'>
                    {createableSelect(
                        methods.control,
                        'majorLearningGoals',
                        options
                    )}
                </div>
            </div>

            <div className="mt-12">
                <div className={'flex justify-between items-center text-slate-600 text-xl mb-2 relative'}>
                    3. Zu welchem Thema / welchen Themen findet der VE statt?
                    <Tooltip tooltipsText="Inspiration zu fachbezogenen Themen verschiedener Disziplinen findest du hier in den Selbstlernmaterialien …">
                        <Link
                            target="_blank"
                            href={'/learning-material/top-bubble/Beispiele%20aus%20der%20Praxis'}
                            className='rounded-full shadow hover:bg-gray-50 p-2 mx-2'
                        >
                            <PiBookOpenText size={30} color="#00748f" />
                        </Link>
                    </Tooltip>
                </div>

                <div>
                    {renderTopics()}
                </div>

            </div>


        </Wrapper>
    );
}
