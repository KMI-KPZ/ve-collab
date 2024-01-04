import React, { useState } from 'react';
import { IoMdTrash, IoMdCopy, IoMdCreate, IoMdCheckmark, IoMdClose } from 'react-icons/io';
import { useDragOver } from '@minoru/react-dnd-treeview';
import { RxDropdownMenu } from 'react-icons/rx';
import { FaFile } from 'react-icons/fa';

export type CustomData = {
    fileType: string;
};

export type NodeModel<T = unknown> = {
    id: number;
    parent: number;
    droppable?: boolean;
    text: string;
    data?: T;
};

type Props = {
    node: NodeModel<CustomData>;
    depth: number;
    isOpen: boolean;
    onToggle: (id: NodeModel['id']) => void;
    onDelete: (id: NodeModel['id']) => void;
    onCopy: (id: NodeModel['id']) => void;
    onTextChange: (id: NodeModel['id'], value: string) => void;
};

export const CustomNode: React.FC<Props> = (props) => {
    const [hover, setHover] = useState<boolean>(false);
    const { id, droppable, text, data } = props.node;
    const [visibleInput, setVisibleInput] = useState(false);
    const [labelText, setLabelText] = useState(text);
    const indent = props.depth * 24;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.onToggle(props.node.id);
    };

    const handleShowInput = () => {
        setVisibleInput(true);
    };

    const handleCancel = () => {
        setLabelText(text);
        setVisibleInput(false);
    };

    const handleChangeText = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLabelText(e.target.value);
    };

    const handleSubmit = () => {
        setVisibleInput(false);
        props.onTextChange(id, labelText);
    };

    const dragOverProps = useDragOver(id, props.isOpen, props.onToggle as any);

    return (
        <div
            className={`flex items-center h-[32px] pe-2 my-1`}
            style={{ paddingInlineStart: indent }}
            {...dragOverProps}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div>
                {props.node.droppable && (
                    <div onClick={handleToggle}>
                        <RxDropdownMenu />
                    </div>
                )}
            </div>
            {!droppable && <FaFile />}
            {visibleInput ? (
                <div className="flex">
                    <input
                        type="text"
                        className="mx-1 py-1 px-1 border border-gray-500 rounded-md"
                        value={labelText}
                        onChange={handleChangeText}
                    />
                    <button onClick={handleSubmit} disabled={labelText === ''}>
                        <IoMdCheckmark />
                    </button>
                    <button onClick={handleCancel}>
                        <IoMdClose />
                    </button>
                </div>
            ) : (
                <>
                    {droppable ? (
                        <div className="ps-2">
                            <p>{props.node.text}</p>
                        </div>
                    ) : (
                        <div className="ps-2">
                            <p className="cursor-pointer">{props.node.text}</p>
                        </div>
                    )}
                    {hover && (
                        <div className="flex ml-10">
                            {droppable && (
                                <div className="mx-1">
                                    <button onClick={handleShowInput}>
                                        <IoMdCreate size={18} />
                                    </button>
                                </div>
                            )}
                            <div className="mx-1">
                                <button onClick={() => props.onCopy(id)}>
                                    <IoMdCopy size={18} />
                                </button>
                            </div>
                            <div className="mx-1">
                                <button onClick={() => props.onDelete(id)}>
                                    <IoMdTrash size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
