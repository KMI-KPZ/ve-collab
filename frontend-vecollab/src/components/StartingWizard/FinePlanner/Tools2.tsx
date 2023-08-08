import React from 'react';

interface Props {
    taskIndex: number;
    toolIndex: number;
    tool: string;
    modifyTaskTool: (taskIndex: number, toolIndex: number, value: string) => void;
}

export default function Tools2({ taskIndex, toolIndex, tool, modifyTaskTool }: Props) {
    return (
        <input
            type="text"
            name="tools"
            value={tool}
            onChange={(e) => modifyTaskTool(taskIndex, toolIndex, e.target.value)}
            placeholder="Welche Tools können verwendet werden?"
            className="border border-gray-500 rounded-lg w-full h-12 p-2 my-1"
        />
    );
}
