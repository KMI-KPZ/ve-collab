import Tasks2 from '@/components/StartingWizard/FinePlanner/Tasks2';
import { RxMinus, RxPlus } from 'react-icons/rx';
import WhiteBox from '@/components/Layout/WhiteBox';
import React from 'react';
import { IFineStepFrontend } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { useFormContext, useFieldArray } from 'react-hook-form';

interface Props {
    fineStep: IFineStepFrontend;
}

export default function Stage2({ fineStep }: Props) {
    const { register, control, formState } = useFormContext<IFineStepFrontend>();
    const { fields, append, remove } = useFieldArray<IFineStepFrontend>({
        name: 'tasks',
        control,
    });

    return (
        <WhiteBox>
            <div className="w-[60rem]">
                <div className="flex justify-center items-center">
                    <div className="mx-2">Etappe: {fineStep.name}</div>
                    <div className="mx-2">
                        {fineStep.timestamp_from} - {fineStep.timestamp_to}
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="workload" className="px-2 py-2">
                            Workload (in Stunden)
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
                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        />
                        <p className="text-red-600 pt-2">{formState.errors?.workload?.message}</p>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="social_form" className="px-2 py-2">
                            Sozialform
                        </label>
                    </div>
                    <div className="w-5/6">
                        <input
                            type="text"
                            {...register(`social_form`, {
                                maxLength: {
                                    value: 100,
                                    message: 'Bitte nicht mehr als 100 Zeichen.',
                                },
                            })}
                            placeholder="wie arbeiten die Studierenden zusammen, z.B. Partner-/Gruppenarbeit, individuell"
                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {formState.errors?.social_form?.message}
                        </p>
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
                            className="border border-gray-500 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {formState.errors?.learning_env?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="ve_approach" className="px-2 py-2">
                            VE-Ansatz
                        </label>
                    </div>
                    <div className="w-5/6">
                        <input
                            {...register(`ve_approach`, {
                                maxLength: {
                                    value: 100,
                                    message: 'Bitte nicht mehr als 100 Zeichen.',
                                },
                            })}
                            placeholder="Welche Ansätze werden verfolgt? (z. B. aufgabenorientierter Ansatz, kulturbezogenes Lernen)"
                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {formState.errors?.ve_approach?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="tasks" className="px-2 py-2">
                            Aufgabenstellungen
                        </label>
                    </div>
                    <div className="flex flex-col w-5/6">
                        {fields.map((task, taskIndex) => (
                            <div className="relative" key={task.id}>
                                <Tasks2 taskIndex={taskIndex} />
                                <div className="absolute left-10 bottom-7">
                                    <button type="button" onClick={() => remove(taskIndex)}>
                                        <RxMinus size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="w-full flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    append({
                                        title: '',
                                        description: '',
                                        learning_goal: '',
                                        tools: [{ name: '' }, { name: '' }],
                                    });
                                }}
                            >
                                <RxPlus size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </WhiteBox>
    );
}
