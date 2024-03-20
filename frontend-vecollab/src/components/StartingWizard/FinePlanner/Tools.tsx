import React from 'react';
import { useFormContext } from 'react-hook-form';
import { RxMinus } from 'react-icons/rx';
import { IFineStepFrontend } from '@/pages/startingWizard/fineplanner/[stepSlug]';

interface Props {
    taskIndex: number;
    toolIndex: number;
    removeItem: (index: number) => void;
}

export default function Tools({ toolIndex, taskIndex, removeItem }: Props) {
    const { register, formState } = useFormContext<IFineStepFrontend>();
    return (
        <div className="flex gap-5">
            <input
                type="text"
                {...register(`tasks.${taskIndex}.tools.${toolIndex}.name`, {
                    maxLength: {
                        value: 100,
                        message: 'Bitte nicht mehr als 100 Zeichen.',
                    },
                })}
                placeholder="Welche Tools können verwendet werden?"
                className="w-full border border-gray-400 rounded-lg p-2"
            />
            <button
                type="button"
                className=""
                onClick={() => {
                    removeItem(toolIndex);
                }}
            >
                <RxMinus size={20} />
            </button>
            <p className="text-red-600 pt-2">
                {formState.errors?.tasks?.[taskIndex]?.tools?.[toolIndex]?.message}
            </p>
        </div>
    );
}
