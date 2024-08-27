import Tasks from '@/components/VE-designer/FinePlanner/Tasks';
import React from 'react';
import { IFineStepFrontend, ITaskFrontend } from '@/pages/ve-designer/step-data/[stepName]';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import Image from 'next/image';
import imageTrashcan from '@/images/icons/ve-designer/trash.png';

interface Props {
    fineStep: IFineStepFrontend;
}

export const defaultValueTask: ITaskFrontend = {
    task_formulation: '',
    work_mode: '',
    notes: '',
    tools: [{ name: '' }, { name: '' }],
    materials: [{ name: '' }, { name: '' }],
};

export default function Stage({ fineStep }: Props) {
    const { register, control, formState, watch } = useFormContext<IFineStepFrontend>();
    const { fields, append, remove, update } = useFieldArray<IFineStepFrontend>({
        name: 'tasks',
        control,
        rules: { minLength: 1 },
    });
    let dateFrom = new Date(fineStep.timestamp_from).toLocaleString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    let dateTo = new Date(fineStep.timestamp_to).toLocaleString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, defaultValueTask);
        }
    };

    function radioBooleanInput(control: any, name: any): JSX.Element {
        return (
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <div className="flex">
                            <div>
                                <label className="px-2 py-2">Ja</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(true)} // send value to hook form
                                    checked={value === true}
                                />
                            </div>
                        </div>
                        <div className="flex">
                            <div>
                                <label className="px-2 py-2">Nein</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(false)} // send value to hook form
                                    checked={value === false}
                                />
                            </div>
                        </div>
                    </>
                )}
            />
        );
    }

    return (
        <div className="">
            <div className="">
                <div className="flex">
                    <div className="font-bold mx-2">Zeitspanne:</div>
                    <div className="mx-2">
                        {dateFrom} - {dateTo}
                    </div>
                </div>
            </div>
            <div className="mt-4 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="learning_goal" className="px-2 py-2">
                        Lernaktivität(en)
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        {...register(`learning_activity`)}
                        rows={2}
                        placeholder="mehrere durch Komma trennen"
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.learning_activity?.message}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <p>Möchten Sie Lernaktivität(en) im Designer genauer ausarbeiten?</p>
                <div className="flex">{radioBooleanInput(control, 'has_tasks')}</div>
            </div>
            {watch('has_tasks') && (
                <div className="mt-4 flex">
                    <div className="flex flex-col w-full">
                        {fields.map((task, taskIndex) => (
                            <div className="relative" key={task.id}>
                                <Tasks taskIndex={taskIndex} />
                                <div className="absolute left-10 bottom-7">
                                    <button type="button" onClick={() => handleDelete(taskIndex)}>
                                        <Image
                                            src={imageTrashcan}
                                            width={20}
                                            height={20}
                                            alt="trashcan"
                                        ></Image>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="w-full flex items-center justify-center">
                            <button
                                type="button"
                                className="rounded-2xl bg-slate-200 px-4 py-2 flex items-center space-x-2"
                                onClick={() => {
                                    append(defaultValueTask);
                                }}
                            >
                                weitere Lernaktivität hinzufügen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
