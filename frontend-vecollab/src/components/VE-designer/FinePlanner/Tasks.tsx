import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import {
    IFineStepFrontend,
    IMediaFrontend,
    IToolsFrontend,
} from '@/pages/ve-designer/step-data/[stepName]';
import Tools from '@/components/VE-designer/FinePlanner/Tools';
import { RxPlus } from 'react-icons/rx';
import Media from './Media';

interface Props {
    taskIndex: number;
}

const defaultValueTools: IToolsFrontend = { name: '' };
const defaultValueMedia: IMediaFrontend = { name: '' };

export default function Tasks({ taskIndex }: Props) {
    const { register, formState, control } = useFormContext<IFineStepFrontend>();
    const {
        fields: fieldsTools,
        append: appendTools,
        remove: removeTools,
        update: updateTools,
    } = useFieldArray<IFineStepFrontend>({
        name: `tasks.${taskIndex}.tools`,
        control,
    });
    const {
        fields: fieldsMedia,
        append: appendMedia,
        remove: removeMedia,
        update: updateMedia,
    } = useFieldArray<IFineStepFrontend>({
        name: `tasks.${taskIndex}.media`,
        control,
    });

    const handleDeleteTools = (index: number): void => {
        if (fieldsTools.length > 1) {
            removeTools(index);
        } else {
            updateTools(index, defaultValueTools);
        }
    };

    const handleDeleteMedia = (index: number): void => {
        if (fieldsMedia.length > 1) {
            removeMedia(index);
        } else {
            updateMedia(index, defaultValueMedia);
        }
    };

    return (
        <div className={'px-4 pt-4 pb-12 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'}>
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
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.title?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="learning_goal" className="px-2 py-2">
                        Feinlernziel(e)
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        rows={3}
                        {...register(`tasks.${taskIndex}.learning_goal`, {
                            maxLength: {
                                value: 500,
                                message: 'Bitte nicht mehr als 500 Zeichen.',
                            },
                        })}
                        placeholder="Welche Lernziele werden mit der Aufgabe verfolgt?"
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.learning_goal?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="task_formulation" className="px-2 py-2">
                        Aufgaben-stellung
                    </label>
                </div>
                <div className="w-5/6">
                    <input
                        {...register(`tasks.${taskIndex}.task_formulation`, {
                            maxLength: {
                                value: 500,
                                message: 'Bitte nicht mehr als 500 Zeichen.',
                            },
                        })}
                        placeholder=""
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.task_formulation?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="work_mode" className="px-2 py-2">
                        Arbeitsform
                    </label>
                </div>
                <div className="w-5/6">
                    <input
                        {...register(`tasks.${taskIndex}.work_mode`, {
                            maxLength: {
                                value: 500,
                                message: 'Bitte nicht mehr als 500 Zeichen.',
                            },
                        })}
                        placeholder=""
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.work_mode?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="notes" className="px-2 py-2">
                        Notizen
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        rows={3}
                        {...register(`tasks.${taskIndex}.notes`, {
                            maxLength: {
                                value: 500,
                                message: 'Bitte nicht mehr als 500 Zeichen.',
                            },
                        })}
                        placeholder="optional"
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.tasks?.[taskIndex]?.notes?.message}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="tools" className="px-2 py-2">
                        Tools
                    </label>
                </div>
                <div className="w-5/6 flex flex-col gap-2">
                    {fieldsTools.map((tool, toolIndex) => (
                        <Tools
                            key={tool.id}
                            taskIndex={taskIndex}
                            toolIndex={toolIndex}
                            removeItem={handleDeleteTools}
                        />
                    ))}
                </div>
            </div>
            <div className="flex">
                <div className="w-1/6" />
                <div className="w-5/6 mt-3 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            appendTools(defaultValueTools);
                        }}
                    >
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
            <div className="mt-4 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="media" className="px-2 py-2">
                        Medien
                    </label>
                </div>
                <div className="w-5/6 flex flex-col gap-2">
                    {fieldsMedia.map((media, mediaIndex) => (
                        <Media
                            key={media.id}
                            taskIndex={taskIndex}
                            mediaIndex={mediaIndex}
                            removeItem={handleDeleteMedia}
                        />
                    ))}
                </div>
            </div>
            <div className="flex">
                <div className="w-1/6" />
                <div className="w-5/6 mt-3 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            appendMedia(defaultValueMedia);
                        }}
                    >
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
