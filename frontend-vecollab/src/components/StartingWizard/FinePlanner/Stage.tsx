import Tasks from '@/components/StartingWizard/FinePlanner/Tasks';
import { RxMinus, RxPlus } from 'react-icons/rx';
import WhiteBox from '@/components/Layout/WhiteBox';
import React from 'react';
import { IStep } from '@/pages/startingWizard/finePlanner';

interface Props {
    step: IStep;
    stepIndex: number;
    modifyTaskTool: (index: number, taskIndex: number, toolIndex: number, value: string) => void;
    modifyTask: (stepIndex: number, taskIndex: number, valueName: string, value: string) => void;
    modifyStep: <T>(stepIndex: number, valueName: string, value: T) => void;
    removeToolInputField: (e: React.MouseEvent, stepIndex: number, taskIndex: number) => void;
    addToolInputField: (e: React.MouseEvent, stepIndex: number, taskIndex: number) => void;
    removeTask: (e: React.MouseEvent, stepIndex: number) => void;
    addTask: (e: React.MouseEvent, stepIndex: number) => void;
}

export default function Stage({
    step,
    stepIndex,
    modifyTaskTool,
    modifyTask,
    modifyStep,
    removeTask,
    addTask,
    removeToolInputField,
    addToolInputField,
}: Props) {
    return (
        <WhiteBox>
            <div className="w-[60rem]">
                <div className="flex justify-center items-center">
                    <div className="mx-2">Etappe: {step.name}</div>
                    <div className="mx-2">
                        {step.timestamp_from} - {step.timestamp_to}
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
                            name="workload"
                            value={step.workload}
                            onChange={(e) =>
                                modifyStep<number>(stepIndex, 'workload', Number(e.target.value))
                            }
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
                            name="social_form"
                            value={step.social_form}
                            onChange={(e) =>
                                modifyStep<string>(stepIndex, 'social_form', e.target.value)
                            }
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
                            name="learning_env"
                            value={step.learning_env}
                            onChange={(e) =>
                                modifyStep<string>(stepIndex, 'learning_env', e.target.value)
                            }
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
                            type="text"
                            name="ve_approach"
                            value={step.ve_approach}
                            onChange={(e) =>
                                modifyStep<string>(stepIndex, 've_approach', e.target.value)
                            }
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
                        {step.tasks.map((task, taskIndex) => (
                            <Tasks
                                key={taskIndex}
                                addToolInputField={addToolInputField}
                                modifyTask={modifyTask}
                                modifyTaskTool={modifyTaskTool}
                                removeToolInputField={removeToolInputField}
                                stepIndex={stepIndex}
                                task={task}
                                taskIndex={taskIndex}
                            />
                        ))}
                    </div>
                </div>
                <div className={'mx-7 flex justify-end'}>
                    <button onClick={(e) => removeTask(e, stepIndex)}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={(e) => addTask(e, stepIndex)}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </WhiteBox>
    );
}
