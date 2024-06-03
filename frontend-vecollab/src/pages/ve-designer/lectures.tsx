import WhiteBox from '@/components/Layout/WhiteBox';
import React, { useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import trash from '@/images/icons/ve-designer/trash.png';
import Image from 'next/image';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

export interface Lecture {
    name: string;
    school_type: string;
    country: string;
    departments: string[];
}

interface FormValues {
    lectures: Lecture[];
}

const areAllFormValuesEmpty = (lectures: Lecture[]): boolean => {
    return lectures.every((institution) => {
        return (
            institution.name === '' &&
            institution.school_type === '' &&
            institution.country === '' &&
            institution.departments.every((department) => department === '')
        );
    });
};

Lectures.auth = true;
export default function Lectures() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/partners'
    const nextpage = '/ve-designer/participatingCourses'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            lectures: [
                {
                    name: '',
                    school_type: '',
                    country: '',
                    departments: [],
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        name: 'lectures',
        control: methods.control,
    });

    const setPlanerData = (plan: IPlan) => {
        if (Object.keys(plan.progress).length) {
            setSideMenuStepsProgress(plan.progress);
        }
        if (plan.institutions.length !== 0) {
            methods.setValue('lectures', plan.institutions);
        }
    }

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data.lectures)) {
            return
        }

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'institutions',
                value: data.lectures,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    institutions: ProgressState.completed,
                },
            },
        ]
    };

    const renderLecturesInputs = (): JSX.Element[] => {
        return fields.map((lectures, index) => (
            <div key={lectures.id} className="mx-2">
                <WhiteBox>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="name" className="px-2 py-2">
                                Name
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="Name eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`lectures.${index}.name`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?-,',
                                    },
                                })}
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.lectures?.[index]?.name?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="schoolType" className="px-2 py-2">
                                Bildungseinrichtung
                            </label>
                        </div>
                        <div className="w-2/3">
                            <select
                                placeholder="Bildungseinrichtung eingeben"
                                className="border border-gray-400 rounded-lg w-full px-1 py-2"
                                {...methods.register(`lectures.${index}.school_type`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                })}
                            >
                                <option value="Hochschule/Universität/College">
                                    Hochschule/Universität/College
                                </option>
                                <option value="Fachhochschule/University of Applied Sciences">
                                    Fachhochschule/University of Applied Sciences
                                </option>
                                <option value="Berufsschule">Berufsschule</option>
                                <option value="Schule – Primärbereich">
                                    Schule – Primärbereich
                                </option>
                                <option value="Schule – Sekundarbereich">
                                    Schule – Sekundarbereich
                                </option>

                                <option value="Sonstige">Sonstige</option>
                            </select>
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.lectures?.[index]?.school_type?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="country" className="px-2 py-2">
                                Land
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="Land eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`lectures.${index}.country`, {
                                    maxLength: {
                                        value: 500,
                                        message:
                                            'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                    },
                                    pattern: {
                                        value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                        message:
                                            'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?,-',
                                    },
                                })}
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.lectures?.[index]?.country?.message}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/3 flex items-center">
                            <label htmlFor="department" className="px-2 py-2">
                                Fachbereich
                            </label>
                        </div>
                        <div className="w-2/3">
                            <input
                                type="text"
                                placeholder="Fachbereich eingeben"
                                className="border border-gray-400 rounded-lg w-full p-2"
                                {...methods.register(`lectures.${index}.departments.0`, {
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
                            />
                            <p className="text-red-600 pt-2">
                                {
                                    methods.formState.errors?.lectures?.[index]?.departments?.[0]
                                        ?.message
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
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div>
                <div className={'text-center font-bold text-4xl mb-2'}>
                    In welchen Institutionen wird der VE umgesetzt?
                </div>
                <div className={'text-center mb-20'}>optional</div>
                <div className={'flex flex-wrap justify-center'}>
                    {renderLecturesInputs()}
                </div>
                <div className="flex justify-center">
                    <button
                        className="p-4 bg-white rounded-3xl shadow-2xl"
                        type="button"
                        onClick={() => {
                            append({
                                name: '',
                                school_type: '',
                                country: '',
                                departments: [],
                            });
                        }}
                    >
                        <RxPlus size={30} />
                    </button>
                </div>
            </div>
        </Wrapper>
    );
}
