import React from 'react';
import { useFormContext } from 'react-hook-form';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';

interface Props {
    taskIndex: number;
}

export default function Tasks2({ taskIndex }: Props) {
    const { register, control } = useFormContext<IFineStep>();
    /*        const { fields, append, remove } = useFieldArray({
        name: 'fineStep.tasks.${taskIndex}.tools',
        control,
    });*/

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
                    <div className="w-1/6 flex items-center">
                        <label htmlFor="tools" className="px-2 py-2">
                            Tools & Medien
                        </label>
                    </div>
                    <div className="w-5/6">
                        {/*                        {fields.map((tool, toolIndex) => (
                            <Tools2 key={toolIndex} taskIndex={taskIndex} toolIndex={toolIndex} />
                        ))}*/}
                    </div>
                </div>
            </div>
        </div>
    );
}
