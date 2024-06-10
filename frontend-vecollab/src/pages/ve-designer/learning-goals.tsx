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
import WhiteBox from '@/components/Layout/WhiteBox';
import { BackendProfileSnippetsResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

export interface FormValues {
    majorLearningGoals: MajorLearningGoals[];
    individualLearningGoals: IndividualLearningGoal[];
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
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);
    const [steps, setSteps] = useState<IFineStep[]>([]);
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

    const prevpage = '/ve-designer/target-groups'
    const nextpage = '/ve-designer/methodical-approach'

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
            setLoading(false);
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
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    learning_goals: ProgressState.completed,
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

    return (
        <Wrapper
            title="Lernziele"
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
                    {fields.map((individualLearningGoalPerPartner, index) => (
                        <div
                            key={individualLearningGoalPerPartner.id}
                            className="flex mx-2"
                        >
                            <WhiteBox className="w-fit h-fit">
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
                            </WhiteBox>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-12">
                <div className={'flex justify-between items-center font-bold text-slate-600 text-xl mb-2 relative'}>
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
        </Wrapper>
    );
}
