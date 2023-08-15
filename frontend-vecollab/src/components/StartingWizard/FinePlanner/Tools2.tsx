import React from 'react';
import { useFormContext } from 'react-hook-form';

interface Props {
    taskIndex: number;
    toolIndex: number;
}

export default function Tools2({ toolIndex, taskIndex }: Props) {
    const { register } = useFormContext();
    return (
        <input
            type="text"
            {...register(`fineStep.tasks.${taskIndex}.tools.${toolIndex}`)}
            placeholder="Welche Tools können verwendet werden?"
            className="border border-gray-500 rounded-lg w-full h-12 p-2 my-1"
        />
    );
}
