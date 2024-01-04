import BoxHeadline from '@/components/BoxHeadline';
import WhiteBox from '@/components/Layout/WhiteBox';
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import {
    Tree,
    MultiBackend,
    DragLayerMonitorProps,
    getDescendants,
    getBackendOptions,
} from '@minoru/react-dnd-treeview';
import { RxPlus } from 'react-icons/rx';
import { CustomNode } from '@/components/learningContent/CustomNode';
import { CustomDragPreview } from '@/components/learningContent/CustomDragPreview';

Edit.auth = true;
// TODO only render as admin
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

const getLastId = (treeData: NodeModel[]) => {
    const reversedArray = [...treeData].sort((a, b) => {
        if (a.id < b.id) {
            return 1;
        } else if (a.id > b.id) {
            return -1;
        }

        return 0;
    });

    if (reversedArray.length > 0) {
        return reversedArray[0].id;
    }

    return 0;
};

export default function Edit() {
    const [treeData, setTreeData] = useState<NodeModel<CustomData>[]>([
        {
            id: 1,
            parent: 0,
            droppable: true,
            text: 'VE Planen',
        },
        {
            id: 2,
            parent: 1,
            droppable: true,
            text: 'für Novizen',
        },
        {
            id: 3,
            parent: 2,
            droppable: false,
            text: 'Material 1',
            data: {
                fileType: 'image',
            },
        },
        {
            id: 4,
            parent: 1,
            droppable: true,
            text: 'für Erfahrene',
        },
        {
            id: 5,
            parent: 4,
            droppable: false,
            text: 'Material 2',
            data: {
                fileType: 'image',
            },
        },
        {
            id: 6,
            parent: 1,
            droppable: true,
            text: 'für Expert:innen',
        },
        {
            id: 7,
            parent: 6,
            droppable: false,
            text: 'Material 3',
            data: {
                fileType: 'image',
            },
        },
        {
            id: 8,
            parent: 0,
            droppable: true,
            text: 'Was ist ein VE?',
        },
        {
            id: 9,
            parent: 8,
            droppable: true,
            text: '1. Lektion...',
        },
        {
            id: 10,
            parent: 9,
            droppable: false,
            text: 'Material 4',
            data: {
                fileType: 'image',
            },
        },
    ]);
    const handleDrop = (newTree: any) => setTreeData(newTree);
    const [open, setOpen] = useState<boolean>(false);

    const handleDelete = (id: NodeModel['id']) => {
        const deleteIds = [id, ...getDescendants(treeData, id).map((node) => node.id)];
        const newTree = treeData.filter((node) => !deleteIds.includes(node.id));

        setTreeData(newTree);
    };

    const handleCopy = (id: NodeModel['id']) => {
        const lastId = getLastId(treeData);
        const targetNode = treeData.find((n) => n.id === id);
        const descendants = getDescendants(treeData, id);
        const partialTree = descendants.map((node: any) => ({
            ...node,
            id: node.id + lastId,
            parent: node.parent + lastId,
        }));

        setTreeData([
            ...treeData,
            {
                ...targetNode,
                id: targetNode!.id + lastId,
            },
            ...partialTree,
        ]);
    };

    const handleSubmit = (newNode: Omit<NodeModel<CustomData>, 'id'>) => {
        const lastId = getLastId(treeData) + 1;

        setTreeData([
            ...treeData,
            {
                ...newNode,
                id: lastId,
            },
        ]);

        setOpen(false);
    };

    const handleTextChange = (id: NodeModel['id'], value: string) => {
        const newTree = treeData.map((node) => {
            if (node.id === id) {
                return {
                    ...node,
                    text: value,
                };
            }

            return node;
        });

        setTreeData(newTree);
    };

    return (
        <>
            <div className="flex justify-center">
                <WhiteBox>
                    <div className="w-[60vw] h-[60vh] overflow-y-auto content-scrollbar">
                        <BoxHeadline title="Lehrmaterialien bearbeiten" />
                        <p className="mb-10">TODO: Dialog für Materialien</p>
                        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
                            <div className="flex">
                                <button
                                    className="flex justify-center items-center bg-ve-collab-orange rounded-md px-2 py-1 mx-2 text-white"
                                    onClick={(e) =>
                                        handleSubmit({
                                            parent: 0,
                                            droppable: true,
                                            text: 'neue Ebene',
                                        })
                                    }
                                >
                                    <RxPlus />
                                    <div className="mx-1">neue Hierarchieebene</div>
                                </button>
                                <button
                                    className="flex justify-center items-center bg-ve-collab-orange rounded-md px-2 py-1 mx-2 text-white"
                                    onClick={(e) =>
                                        handleSubmit({
                                            parent: 0,
                                            droppable: false,
                                            text: 'neuer Inhalt',
                                        })
                                    }
                                >
                                    <RxPlus />
                                    <div className="mx-1">neuer Lehrinhalt</div>
                                </button>
                            </div>
                            <div className="h-full">
                                <Tree
                                    tree={treeData}
                                    rootId={0}
                                    render={(node: any, options) => (
                                        <CustomNode
                                            node={node}
                                            {...options}
                                            onDelete={handleDelete}
                                            onCopy={handleCopy}
                                            onTextChange={handleTextChange}
                                        />
                                    )}
                                    dragPreviewRender={(
                                        monitorProps: DragLayerMonitorProps<CustomData>
                                    ) => <CustomDragPreview monitorProps={monitorProps} />}
                                    onDrop={handleDrop}
                                    classes={{
                                        root: 'h-full my-6',
                                        draggingSource: 'opacity-30',
                                        dropTarget: 'bg-[#e8f0fe]',
                                    }}
                                    sort={false}
                                />
                            </div>
                        </DndProvider>
                    </div>
                </WhiteBox>
            </div>
        </>
    );
}
