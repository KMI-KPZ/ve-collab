import React, { useState } from 'react';
import { IoMdTrash, IoMdCopy, IoMdCreate, IoMdCheckmark, IoMdClose } from 'react-icons/io';
import { useDragOver } from '@minoru/react-dnd-treeview';
import { RxDropdownMenu } from 'react-icons/rx';
import { FaFile } from 'react-icons/fa';
import Dialog from '../profile/Dialog';
import BoxHeadline from '../BoxHeadline';

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

    const [currentChosenMaterial, setCurrentChosenMaterial] = useState<string>(''); // TODO, for now this is just a string, but it should be a Material object including the link and metadata

    const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

    const handleOpenMaterialDialog = () => {
        setIsMaterialDialogOpen(true);
    };

    const handleCloseMaterialDialog = () => {
        setIsMaterialDialogOpen(false);
    };

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

    const handleChangeData = (value: string) => {
        // TODO
        // for now, update label text as dummy
        setLabelText(value);
        props.onTextChange(id, value);
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
                            <p className="cursor-pointer" onClick={handleOpenMaterialDialog}>{props.node.text}</p>
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
            <Dialog
                isOpen={isMaterialDialogOpen}
                title={'Lehrinhalt bearbeiten'}
                onClose={() => {
                    handleCloseMaterialDialog();
                }}
            >
                <div className="w-[40rem] h-[40rem] overflow-y-auto content-scrollbar relative">
                    <BoxHeadline title={'Einbettungslink'} />
                    <div className="mb-10">
                        <input
                            type="text"
                            className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1"
                            placeholder="Link zum Lehrinhalt, um ihn einzubetten, TODO would be filled with current value"
                            value={currentChosenMaterial}
                            onChange={(e) => setCurrentChosenMaterial(e.target.value)}
                        />
                    </div>
                    <BoxHeadline title={'Metadaten'} />
                    <div>TODO, would be filled with current values</div>
                    <div className="flex absolute bottom-0 w-full">
                        <button
                            className={
                                'bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={handleCloseMaterialDialog}
                        >
                            <span>Ablehnen</span>
                        </button>
                        <button
                            className={
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                handleChangeData("Material updated dummy-wise");
                                handleCloseMaterialDialog();
                            }}
                        >
                            <span>Annehmen</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
