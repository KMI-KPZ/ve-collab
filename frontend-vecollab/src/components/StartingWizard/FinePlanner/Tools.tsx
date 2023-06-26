import React from 'react';

interface Props {
    stepIndex: number;
    taskIndex: number;
    toolIndex: number;
    tool: string;
    modifyTaskTool: (index: number, taskIndex: number, toolIndex: number, value: string) => void;
}

export default function Tools({ stepIndex, taskIndex, toolIndex, tool, modifyTaskTool }: Props) {
    return (
        <input
            type="text"
            name="tools"
            value={tool}
            onChange={(e) => modifyTaskTool(stepIndex, taskIndex, toolIndex, e.target.value)}
            placeholder="Welche Tools können verwendet werden?"
            className="border border-gray-500 rounded-lg w-full h-12 p-2 my-1"
        />
    );
}
