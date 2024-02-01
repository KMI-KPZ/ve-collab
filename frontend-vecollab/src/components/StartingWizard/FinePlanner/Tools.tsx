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
        <div className="w-full flex flex-row gap-5">
            <input
                type="text"
                {...register(`tasks.${taskIndex}.tools.${toolIndex}.name`, {
                    maxLength: {
                        value: 100,
                        message: 'Bitte nicht mehr als 100 Zeichen.',
                    },
                })}
                placeholder="Welche Tools können verwendet werden?"
                className="w-full border border-gray-500 rounded-lg h-12 p-2 my-1"
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
