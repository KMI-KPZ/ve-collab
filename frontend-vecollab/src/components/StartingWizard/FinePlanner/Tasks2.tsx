import React from 'react';
import { useFormContext } from 'react-hook-form';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import Tools2 from '@/components/StartingWizard/FinePlanner/Tools2';
import { RxPlus } from 'react-icons/rx';

interface Props {
    taskIndex: number;
}

export default function Tasks2({ taskIndex }: Props) {
    const { register, watch, setValue } = useFormContext<IFineStep>();
    const tools: string[] = watch(`tasks.${taskIndex}.tools`);

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
                        {...register(`tasks.${taskIndex}.title`)}
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
                        {...register(`tasks.${taskIndex}.description`)}
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
                        {...register(`tasks.${taskIndex}.learning_goal`)}
                        placeholder="Welche Lernziele werden mit der Aufgabe verfolgt?"
                        className="border border-gray-500 rounded-lg w-full p-2"
                    />
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
                        {tools.map((tool, toolIndex) => (
                            <Tools2 key={toolIndex} taskIndex={taskIndex} toolIndex={toolIndex} />
                        ))}
                        <div className="w-full flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setValue(`tasks.${taskIndex}.tools`, [...tools, '']);
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
