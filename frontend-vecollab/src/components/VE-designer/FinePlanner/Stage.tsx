import Tasks from '@/components/VE-designer/FinePlanner/Tasks';
import WhiteBox from '@/components/Layout/WhiteBox';
import React from 'react';
import { IFineStepFrontend, ITaskFrontend } from '@/pages/ve-designer/step-data/[stepName]';
import { useFormContext, useFieldArray } from 'react-hook-form';
import Image from 'next/image';
import imageTrashcan from '@/images/icons/ve-designer/trash.png';

interface Props {
    fineStep: IFineStepFrontend;
}

export const defaultValueTask: ITaskFrontend = {
    title: '',
    learning_goal: '',
    task_formulation: '',
    social_form: '',
    description: '',
    tools: [{ name: '' }, { name: '' }],
    media: [{ name: '' }, { name: '' }],
};

export default function Stage({ fineStep }: Props) {
    const { register, control, formState } = useFormContext<IFineStepFrontend>();
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

    return (
        <WhiteBox>
            <div className="w-[60rem]">
                <div className="flex justify-center items-center space-x-10">
                    <div className="flex">
                        <div className="font-bold text-xl mx-2">Etappe:</div>
                        <div className="font-bold text-xl">{fineStep.name}</div>
                    </div>
                    <div className="flex">
                        <div className="font-bold mx-2">Zeitspanne:</div>
                        <div className="mx-2">
                            {dateFrom} - {dateTo}
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="workload" className="px-2 py-2">
                            Zeitumfang (in Stunden)
                        </label>
                    </div>
                    <div className="w-5/6">
                        <input
                            type="number"
                            {...register(`workload`, {
                                max: {
                                    value: 9999,
                                    message: 'Geben Sie bitte einen realistischen Workload an.',
                                },
                                valueAsNumber: true,
                            })}
                            placeholder="in Stunden"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">{formState.errors?.workload?.message}</p>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="learning_env" className="px-2 py-2">
                            digitale Lernumgebung
                        </label>
                    </div>
                    <div className="w-5/6">
                        <textarea
                            rows={5}
                            {...register(`learning_env`, {
                                maxLength: {
                                    value: 500,
                                    message: 'Bitte nicht mehr als 500 Zeichen.',
                                },
                            })}
                            placeholder="Struktur und Inhalte der ausgewählten Umgebung (LMS, social Media, kooperatives Dokument usw.)"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {formState.errors?.learning_env?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="learning_goal" className="px-2 py-2">
                            Lernziel(e) dieser Etappe
                        </label>
                    </div>
                    <div className="w-5/6">
                        <input
                            {...register(`learning_goal`, {
                                maxLength: {
                                    value: 500,
                                    message: 'Bitte nicht mehr als 500 Zeichen.',
                                },
                            })}
                            placeholder="mehrere durch Komma trennen"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {formState.errors?.learning_goal?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex mt-8">
                        <label htmlFor="tasks" className="px-2 py-2">
                            Aufgabenstellungen
                        </label>
                    </div>
                    <div className="flex flex-col w-5/6">
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
                                neue Aufgabe hinzufügen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </WhiteBox>
    );
}
