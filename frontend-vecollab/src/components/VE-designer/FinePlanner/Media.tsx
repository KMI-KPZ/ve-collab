import React from 'react';
import { useFormContext } from 'react-hook-form';
import { RxMinus } from 'react-icons/rx';
import { IFineStepFrontend } from '@/pages/ve-designer/step-data/[stepName]';

interface Props {
    taskIndex: number;
    mediaIndex: number;
    removeItem: (index: number) => void;
}

export default function Media({ mediaIndex, taskIndex, removeItem }: Props) {
    const { register, formState } = useFormContext<IFineStepFrontend>();
    return (
        <div className="flex gap-5">
            <input
                type="text"
                {...register(`tasks.${taskIndex}.media.${mediaIndex}.name`, {
                    maxLength: {
                        value: 500,
                        message: 'Bitte nicht mehr als 500 Zeichen.',
                    },
                })}
                placeholder="Welche Medien können verwendet werden?"
                className="w-full border border-gray-400 rounded-lg p-2"
            />
            <button
                type="button"
                className=""
                onClick={() => {
                    removeItem(mediaIndex);
                }}
            >
                <RxMinus size={20} />
            </button>
            <p className="text-red-600 pt-2">
                {formState.errors?.tasks?.[taskIndex]?.media?.[mediaIndex]?.message}
            </p>
        </div>
    );
}
