import React from 'react';
import { useFormContext } from 'react-hook-form';
import { RxMinus } from 'react-icons/rx';

interface Props {
    taskIndex: number;
    toolIndex: number;
}

export default function Tools2({ toolIndex, taskIndex }: Props) {
    const { register, unregister } = useFormContext();
    const deleteTool = () => {
        unregister(`tasks.${taskIndex}.tools.${toolIndex}`);
    };
    return (
        <div className="w-full flex flex-row gap-5">
            <input
                type="text"
                {...register(`tasks.${taskIndex}.tools.${toolIndex}`)}
                placeholder="Welche Tools können verwendet werden?"
                className="w-full border border-gray-500 rounded-lg h-12 p-2 my-1"
            />
            <button
                type="button"
                className=""
                onClick={() => {
                    deleteTool();
                }}
            >
                <RxMinus size={20} />
            </button>
        </div>
    );
}
