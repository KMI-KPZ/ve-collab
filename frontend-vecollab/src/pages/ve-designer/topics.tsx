import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { RxMinus, RxPlus } from 'react-icons/rx';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

interface Topic {
    name: string;
}

interface FormValues {
    topics: Topic[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.topics.every((topic) => {
        return topic.name === '';
    });
};

Topics.auth = true;
export default function Topics() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/methodical-approach'
    const nextpage = '/ve-designer/languages'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            topics: [{ name: '' }],
        },
    });

    const setPlanerData = useCallback((plan: IPlan) => {
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
    }, [methods]);

    const { fields, append, remove } = useFieldArray({
        name: 'topics',
        control: methods.control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data)) return

        return [
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
                    topics: ProgressState.completed,
                },
            },
        ]
    };

    return (
        <Wrapper
            title="Themen"
            subtitle='Zu welchem Thema / welchen Themen findet der VE statt?'
            tooltip={{
                text: 'Inspiration zu fachbezogenen Themen verschiedener Disziplinen findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/top-bubble/Beispiele%20aus%20der%20Praxis'            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="flex flex-col ">
                {fields.map((topic, index) => (
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
                                onClick={() => remove(index)}
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
        </Wrapper>
    );
}
