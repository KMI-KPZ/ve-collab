import WhiteBox from '@/components/Layout/WhiteBox';
import React, { useCallback, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import Image from 'next/image';
import trash from '@/images/icons/ve-designer/trash.png';
import questionMark from '@/images/icons/ve-designer/questionMarkIcon.png';
import { Tooltip } from '@/components/Tooltip';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

export interface TargetGroup {
    name: string;
    age_min: string;
    age_max: string;
    experience: string;
    academic_course: string;
    mother_tongue: string;
    foreign_languages: string;
}

interface FormValues {
    targetGroups: TargetGroup[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.targetGroups.every((targetGroup) => {
        return (
            targetGroup.name === '' &&
            targetGroup.age_min === '' &&
            targetGroup.age_max === '' &&
            targetGroup.experience === '' &&
            targetGroup.academic_course === '' &&
            targetGroup.mother_tongue === '' &&
            targetGroup.foreign_languages === ''
        );
    });
};

TargetGroups.auth = true;
export default function TargetGroups() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/participatingCourses'
    const nextpage = '/ve-designer/learning-goals'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            targetGroups: [
                {
                    name: '',
                    age_min: '',
                    age_max: '',
                    experience: '',
                    academic_course: '',
                    mother_tongue: '',
                    foreign_languages: '',
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        name: 'targetGroups',
        control: methods.control,
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (plan.audience.length !== 0) {
            methods.setValue('targetGroups', plan.audience);
        }
    }, [methods]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data)) return

        return  [
            {
                plan_id: router.query.plannerId,
                field_name: 'audience',
                value: data.targetGroups,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    audience: ProgressState.completed,
                },
            },
        ]
    };

    const renderTargetGroupsInputs = (): JSX.Element[] => {
        return fields.map((targetGroup, index) => (
            <div key={targetGroup.id} className="mx-2">
                <WhiteBox>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="name" className="px-2 py-2">
                                Bezeichnung
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...methods.register(`targetGroups.${index}.name`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?,-',
                                    },
                                })}
                                placeholder="Name eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.targetGroups?.[index]?.name?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="age" className="px-2 py-2">
                                Alter
                            </label>
                        </div>
                        <div className="w-3/4 flex">
                            <div>
                                <input
                                    type="number"
                                    {...methods.register(`targetGroups.${index}.age_min`, {
                                        maxLength: {
                                            value: 4,
                                            message: 'Bitte geben sie eine realistische Zahl ein',
                                        },
                                        pattern: {
                                            value: /^\d+$/,
                                            message: 'Bitte nur ganze postive Zahlen',
                                        },
                                    })}
                                    placeholder="von"
                                    className="border border-gray-400 rounded-lg w-1/2 p-2 mr-2"
                                />
                                <p className="text-red-600 pt-2">
                                    {
                                        methods.formState.errors?.targetGroups?.[index]?.age_min
                                            ?.message
                                    }
                                </p>
                            </div>
                            <div>
                                <input
                                    type="number"
                                    {...methods.register(`targetGroups.${index}.age_max`, {
                                        maxLength: {
                                            value: 4,
                                            message: 'Bitte geben sie eine realistische Zahl ein',
                                        },
                                        pattern: {
                                            value: /^\d+$/,
                                            message: 'Bitte nur ganze postive Zahlen',
                                        },
                                    })}
                                    placeholder="bis"
                                    className="border border-gray-400 rounded-lg w-1/2 p-2 ml-2"
                                />
                                <p className="text-red-600 pt-2">
                                    {
                                        methods.formState.errors?.targetGroups?.[index]?.age_max
                                            ?.message
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="experience" className="px-2 py-2">
                                VE-Projektrelevante Erfahrungen
                            </label>
                        </div>
                        <div className="w-3/4">
                            <textarea
                                rows={3}
                                {...methods.register(`targetGroups.${index}.experience`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?,-',
                                    },
                                })}
                                placeholder=" z.B. Sprachkenntnisse, bisherige Seminare zum Thema, etc."
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]?.experience
                                        ?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="academic_course" className="px-2 py-2">
                                Studiengang
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...methods.register(`targetGroups.${index}.academic_course`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Studiengang eingeben, mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]?.academic_course
                                        ?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="motherTongue" className="px-2 py-2">
                                Erstsprachen
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...methods.register(`targetGroups.${index}.mother_tongue`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Erstsprachen eingeben, mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]?.mother_tongue
                                        ?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/4 flex items-center">
                            <label htmlFor="foreignLanguages" className="px-2 py-2">
                                Weitere Sprachen
                            </label>
                        </div>
                        <div className="w-3/4">
                            <input
                                type="text"
                                {...methods.register(`targetGroups.${index}.foreign_languages`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                                    },
                                })}
                                placeholder="Weitere Sprachen eingeben, mehrere durch Komma trennen"
                                className="border border-gray-400 rounded-lg w-full p-2"
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.targetGroups?.[index]
                                        ?.foreign_languages?.message
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end items-center">
                        <Image
                            className="mx-2 cursor-pointer m-2 "
                            onClick={() => remove(index)}
                            src={trash}
                            width={20}
                            height={20}
                            alt="deleteStep"
                        ></Image>
                    </div>
                </WhiteBox>
            </div>
        ));
    };

    return (
        <Wrapper
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            setProgress={setSideMenuStepsProgress}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'text-center font-bold text-4xl mb-2 relative'}>
                An welche Zielgruppen richtet sich der VE?
                <Tooltip tooltipsText="Es ist wichtig, sich mit der Zielgruppe zu beschäftigen, um Lehr-/Lernziele und Inhalte des VEs optimal an die Lernenden anzupassen. Die Zielgruppe ist noch nicht bekannt? Dieses Feld kann auch zu einem späteren Zeitpunkt ausgefüllt werden">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        src={questionMark}
                        width={40}
                        height={40}
                        alt="info"
                    ></Image>
                </Tooltip>
            </div>
            <div className={'text-center mb-20'}>optional</div>
            <div className="flex flex-wrap justify-center">
                {renderTargetGroupsInputs()}
            </div>
            <div className="flex justify-center">
                <button
                    className="p-4 bg-white rounded-3xl shadow-2xl"
                    type="button"
                    onClick={() => {
                        append({
                            name: '',
                            age_min: '',
                            age_max: '',
                            experience: '',
                            academic_course: '',
                            mother_tongue: '',
                            foreign_languages: '',
                        });
                    }}
                >
                    <RxPlus size={30} />
                </button>
            </div>
        </Wrapper>
    );
}
