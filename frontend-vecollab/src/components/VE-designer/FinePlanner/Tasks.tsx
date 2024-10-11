import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import {
    IFineStepFrontend,
    IMaterialFrontend,
    IToolsFrontend,
} from '@/pages/ve-designer/step/[stepName]';
import Tools from '@/components/VE-designer/FinePlanner/Tools';
import { RxPlus } from 'react-icons/rx';
import Material from './Material';
import { useTranslation } from 'next-i18next';

interface Props {
    taskIndex: number;
}

const defaultValueTools: IToolsFrontend = { name: '' };
const defaultValueMedia: IMaterialFrontend = { name: '' };

export default function Tasks({ taskIndex }: Props) {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns

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
        fields: fieldsMaterial,
        append: appendMaterial,
        remove: removeMaterial,
        update: updateMaterial,
    } = useFieldArray<IFineStepFrontend>({
        name: `tasks.${taskIndex}.materials`,
        control,
    });

    const handleDeleteTools = (index: number): void => {
        if (fieldsTools.length > 1) {
            removeTools(index);
        } else {
            updateTools(index, defaultValueTools);
        }
    };

    const handleDeleteMaterial = (index: number): void => {
        if (fieldsMaterial.length > 1) {
            removeMaterial(index);
        } else {
            updateMaterial(index, defaultValueMedia);
        }
    };

    return (
        <div className={'px-4 pt-4 pb-12 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'}>
            <div className="mt-2 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="task_formulation" className="px-2 py-2">
                        {t("step-data.task")}
                    </label>
                </div>
                <div className="w-5/6">
                    <input
                        {...register(`tasks.${taskIndex}.task_formulation`)}
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
                        {t("step-data.work_mode")}
                    </label>
                </div>
                <div className="w-5/6">
                    <input
                        {...register(`tasks.${taskIndex}.work_mode`)}
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
                        {t("step-data.notes")}
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        rows={3}
                        {...register(`tasks.${taskIndex}.notes`)}
                        placeholder={t("common:optional")}
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
                        {t("step-data.tools")}
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
                    <label htmlFor="materials" className="px-2 py-2">
                        {t("step-data.materials")}
                    </label>
                </div>
                <div className="w-5/6 flex flex-col gap-2">
                    {fieldsMaterial.map((materials, materialsIndex) => (
                        <Material
                            key={materials.id}
                            taskIndex={taskIndex}
                            materialsIndex={materialsIndex}
                            removeItem={handleDeleteMaterial}
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
                            appendMaterial(defaultValueMedia);
                        }}
                    >
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
