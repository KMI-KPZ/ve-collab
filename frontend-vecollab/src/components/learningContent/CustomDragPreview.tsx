import React from 'react';
import { DragLayerMonitorProps } from '@minoru/react-dnd-treeview';
import { FaFile } from 'react-icons/fa';

type Props = {
    monitorProps: DragLayerMonitorProps<CustomData>;
};

export type CustomData = {
    url: string;
};

export const CustomDragPreview: React.FC<Props> = (props) => {
    const item = props.monitorProps.item;

    return (
        <div className="inline-grid grid-cols-[auto_auto] items-center gap-2 bg-[#1967d2] rounded-md shadow-md text-sm py-1 px-2 pointer-events-none">
            {!item.droppable && (
                <FaFile />
            )}
            <div className="flex items-center">{item.text}</div>
        </div>
    );
};
