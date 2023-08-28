import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { IFineStepFrontend, IToolsFrontend } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import Tools2 from '@/components/StartingWizard/FinePlanner/Tools2';
import { RxPlus } from 'react-icons/rx';

interface Props {
    taskIndex: number;
}

const defaultValueTools: IToolsFrontend = { name: '' };

export default function Tasks2({ taskIndex }: Props) {
    const { register, formState, control } = useFormContext<IFineStepFrontend>();
    const { fields, append, remove, update } = useFieldArray<IFineStepFrontend>({
        name: `tasks.${taskIndex}.tools`,
        control,
    });

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, defaultValueTools);
        }
    };

    return (
        <div className={'p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'}>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="title" className="px-2 py-2">
                        Titel
                    </label>
                </div>
                <div className="w-5/6">
                    <input
                        type="text"
                        {...register(`tasks.${taskIndex}.title`, {
                            maxLength: {
                                value: 100,
                                message: 'Bitte nicht mehr als 100 Zeichen.',
                            },
                        })}
                        placeholder="Aufgabentitel"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.title?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="description" className="px-2 py-2">
                        Beschreibung
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        rows={5}
                        {...register(`tasks.${taskIndex}.description`, {
                            maxLength: {
                                value: 500,
                                message: 'Bitte nicht mehr als 500 Zeichen.',
                            },
                        })}
                        placeholder="Beschreibe die Aufgabe detailierter"
                        className="border border-gray-500 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.description?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="learning_goal" className="px-2 py-2">
                        Lernziele
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        rows={5}
                        {...register(`tasks.${taskIndex}.learning_goal`, {
                            maxLength: {
                                value: 500,
                                message: 'Bitte nicht mehr als 500 Zeichen.',
                            },
                        })}
                        placeholder="Welche Lernziele werden mit der Aufgabe verfolgt?"
                        className="border border-gray-500 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.learning_goal?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2">
                <div className="flex">
                    <div className="w-1/6 flex items-start">
                        <label htmlFor="tools" className="px-2 py-2">
                            Tools & Medien
                        </label>
                    </div>
                    <div className="w-full flex flex-col gap-2">
                        {fields.map((tool, toolIndex) => (
                            <Tools2
                                key={tool.id}
                                taskIndex={taskIndex}
                                toolIndex={toolIndex}
                                removeItem={handleDelete}
                            />
                        ))}
                        <div className="w-full flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    append(defaultValueTools);
                                }}
                            >
                                <RxPlus size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
