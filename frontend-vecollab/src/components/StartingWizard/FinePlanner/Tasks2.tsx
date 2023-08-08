import React from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import Tools2 from '@/components/StartingWizard/FinePlanner/Tools2';
import { ITask } from '@/pages/startingWizard/finePlanner';

interface Props {
    task: ITask;
    taskIndex: number;
    modifyTask: (taskIndex: number, valueName: string, value: string) => void;
    modifyTaskTool: (taskIndex: number, toolIndex: number, value: string) => void;
    removeToolInputField: (e: React.MouseEvent, taskIndex: number) => void;
    addToolInputField: (e: React.MouseEvent, taskIndex: number) => void;
}

export default function Tasks2({
    task,
    taskIndex,
    modifyTask,
    modifyTaskTool,
    removeToolInputField,
    addToolInputField,
}: Props) {
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
                        name="title"
                        value={task.title}
                        onChange={(e) => modifyTask(taskIndex, 'title', e.target.value)}
                        placeholder="Aufgabentitel"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
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
                        name="description"
                        value={task.description}
                        onChange={(e) => modifyTask(taskIndex, 'description', e.target.value)}
                        placeholder="Beschreibe die Aufgabe detailierter"
                        className="border border-gray-500 rounded-lg w-full p-2"
                    />
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
                        name="learning_goal"
                        value={task.learning_goal}
                        onChange={(e) => modifyTask(taskIndex, 'learning_goal', e.target.value)}
                        placeholder="Welche Lernziele werden mit der Aufgabe verfolgt?"
                        className="border border-gray-500 rounded-lg w-full p-2"
                    />
                </div>
            </div>
            <div className="mt-2">
                <div className="flex">
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="tools" className="px-2 py-2">
                            Tools & Medien
                        </label>
                    </div>
                    <div className="w-5/6">
                        {task.tools.map((tool, toolIndex) => (
                            <Tools2
                                // nur state mitgeben
                                key={toolIndex}
                                taskIndex={taskIndex}
                                toolIndex={toolIndex}
                                tool={tool}
                                modifyTaskTool={modifyTaskTool}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className={'mx-7 flex justify-end'}>
                <button onClick={(e) => removeToolInputField(e, taskIndex)}>
                    <RxMinus size={20} />
                </button>
                <button onClick={(e) => addToolInputField(e, taskIndex)}>
                    <RxPlus size={20} />
                </button>
            </div>
        </div>
    );
}
