import WhiteBox from '@/components/Layout/WhiteBox';
import React, { useCallback, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
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

interface Language {
    language: string;
}

interface FormValues {
    targetGroups: TargetGroup[];
    languages: Language[];

}

const areAllFormValuesEmpty = (formValues: FormValues): boolean =>
        formValues.languages.every((languageObject) => languageObject.language === '')
    &&  formValues.targetGroups.every((targetGroup) => {
        return (
            targetGroup.name === '' &&
            targetGroup.age_min === '' &&
            targetGroup.age_max === '' &&
            targetGroup.experience === '' &&
            targetGroup.academic_course === '' &&
            targetGroup.mother_tongue === '' &&
            targetGroup.foreign_languages === ''
        )
    })

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
            languages: [{ language: '' }],
        },
    });

    const {
        fields: fieldsTg,
        append: appendTg,
        remove: removeTg
    } = useFieldArray({
        name: 'targetGroups',
        control: methods.control,
    });

    const {
        fields: fieldsLang,
        append: appendLang,
        remove: removeLang
    } = useFieldArray({
        name: 'languages',
        control: methods.control,
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (plan.audience.length !== 0) {
            methods.setValue('targetGroups', plan.audience);
        }
        if (plan.languages.length !== 0) {
            methods.setValue(
                'languages',
                plan.languages.map((element: string) => ({ language: element }))
            );
        }
        if (Object.keys(plan.progress).length) {
            setSideMenuStepsProgress(plan.progress)
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
                field_name: 'languages',
                value: data.languages.map((element) => element.language),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    audience: ProgressState.completed,
                    languages: ProgressState.completed
                },
            },
        ]
    };

    const renderTargetGroupsInputs = (): JSX.Element[] => {
        return fieldsTg.map((targetGroup, index) => (
            <div key={targetGroup.id} className="mx-2">
                <div className='rounded shadow p-2'>
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
                            onClick={() => removeTg(index)}
                            src={trash}
                            width={20}
                            height={20}
                            alt="deleteStep"
                        ></Image>
                    </div>
                </div>
            </div>
        ));
    };

    const renderLanguagesInputs = (): JSX.Element[] => {
        return fieldsLang.map((language, index) => (
            <div key={language.id} className="mt-2 flex flex-col items-center">
                <div className="flex items-center w-full">
                    <input
                        type="text"
                        placeholder="Sprache eingeben"
                        className="border border-gray-300 rounded-lg w-1/2 p-2 mr-2"
                        {...methods.register(`languages.${index}.language`, {
                            maxLength: {
                                value: 500,
                                message: 'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                            },
                            pattern: {
                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                message: 'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                            },
                        })}
                    />
                    <button type="button" onClick={() => removeLang(index)}>
                        <RxMinus size={20} />
                    </button>
                </div>
                {methods.formState.errors?.languages?.[index]?.language?.message && (
                    <p className="text-red-600 pt-2">
                        {methods.formState.errors?.languages?.[index]?.language?.message}
                    </p>
                )}
            </div>
        ));
    };

    return (
        <Wrapper
            title='Zielgruppen & Sprachen'
            subtitle='An welche Zielgruppen richtet sich der VE?'
            tooltip={{text: 'Es ist wichtig, sich mit der Zielgruppe zu beschäftigen, um Lehr-/Lernziele und Inhalte des VEs optimal an die Lernenden anzupassen. Die Zielgruppe ist noch nicht bekannt? Dieses Feld kann auch zu einem späteren Zeitpunkt ausgefüllt werden', link: ''}}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className='mb-4'>
                <div className="flex flex-wrap">
                    {renderTargetGroupsInputs()}
                </div>
                <div className="flex">
                    <button
                        className="p-3 m-2 bg-white rounded-full shadow"
                        type="button"
                        onClick={() => {
                            appendTg({
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
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
            <div className=''>
                <div className='text-xl mb-2'>In welchen Sprachen findet der VE (hauptsächlich) statt?</div>
                <div className="flex flex-col ">
                    {renderLanguagesInputs()}
                </div>
                <div className="flex  mt-4">
                    <button
                        className="p-3 m-2 bg-white rounded-full shadow"
                        type="button"
                        onClick={() => {
                            appendLang({
                                language: '',
                            });
                        }}
                    >
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </Wrapper>
    );
}
