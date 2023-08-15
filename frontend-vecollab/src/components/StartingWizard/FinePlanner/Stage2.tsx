import Tasks2 from '@/components/StartingWizard/FinePlanner/Tasks2';
import { RxMinus, RxPlus } from 'react-icons/rx';
import WhiteBox from '@/components/Layout/WhiteBox';
import React from 'react';
import { IFormValuesFineSteps, IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { ITask } from '@/pages/startingWizard/finePlanner';
import Tools2 from '@/components/StartingWizard/FinePlanner/Tools2';

interface Props {
    fineStep: IFineStep;
}

export default function Stage2({ fineStep }: Props) {
    const { register, control } = useFormContext<IFormValuesFineSteps>();
    const { fields, append, remove } = useFieldArray<IFormValuesFineSteps>({
        name: 'fineStep.tasks',
        control,
    });
    console.log('fields', fields);
    console.log('finestep', fineStep);

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
                            {...register(`fineStep.workload`, {
                                valueAsNumber: true,
                            })}
                            placeholder="in Stunden"
                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        />
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
                            {...register(`fineStep.social_form`)}
                            placeholder="wie arbeiten die Studierenden zusammen, z.B. Partner-/Gruppenarbeit, individuell"
                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        />
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
                            {...register(`fineStep.learning_env`)}
                            placeholder="Struktur und Inhalte der ausgewählten Umgebung (LMS, social Media, kooperatives Dokument usw.)"
                            className="border border-gray-500 rounded-lg w-full p-2"
                        />
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
                            {...register(`fineStep.ve_approach`)}
                            placeholder="Welche Ansätze werden verfolgt? (z. B. aufgabenorientierter Ansatz, kulturbezogenes Lernen)"
                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                        />
                    </div>
                </div>
                <div className="mt-4 flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="tasks" className="px-2 py-2">
                            Aufgabenstellungen
                        </label>
                    </div>
                    <div className="w-5/6">
                        {fields.map((task, taskIndex) => (
                            <div key={taskIndex}>
                                <Tasks2 taskIndex={taskIndex} />
                                <div className={'mx-7 flex justify-end'}>
                                    <button onClick={() => remove(taskIndex)}>
                                        <RxMinus size={20} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            append({
                                                title: '',
                                                description: '',
                                                learning_goal: '',
                                                tools: ['', ''],
                                            });
                                        }}
                                    >
                                        <RxPlus size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </WhiteBox>
    );
}
