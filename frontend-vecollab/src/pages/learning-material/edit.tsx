import WhiteBox from '@/components/common/WhiteBox';
import React, { useEffect, useState } from 'react';
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
import Dialog from '@/components/profile/Dialog';
import { fetchGET, fetchPOST, useGetCheckAdminUser } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Alert from '@/components/common/dialogs/Alert';
import BoxHeadline from '@/components/common/BoxHeadline';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CustomHead from '@/components/metaData/CustomHead';
import { useTranslation } from 'next-i18next';

export type Metadata = {
    name: string;
    description?: string;
    keywords?: string[];
    creator?: {
        type?: 'Person' | 'Organisation';
        name?: string;
        title?: string;
        uri?: string;
        affiliation?: string;
        affiliationUri?: string;
    };
    date?: string;
};

export type CustomData = {
    description: string;
    urls: {
        de: string;
        en: string;
    };
    metadata?: Metadata;
    mbr_id?: string;
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

Edit.auth = true;
Edit.autoForward = true;
export default function Edit() {
    const { data: session } = useSession();
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const { t } = useTranslation('common');

    const { data: isUserAdmin, isLoading } = useGetCheckAdminUser(session!.accessToken);

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
            droppable: false,
            text: 'Material 1',
            data: {
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                urls: {
                    de: 'http://localhost/dummy',
                    en: 'http://localhost/dummy',
                },
            },
        },
        {
            id: 3,
            parent: 1,
            droppable: false,
            text: 'Material 2',
            data: {
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                urls: {
                    de: 'http://localhost/dummy',
                    en: 'http://localhost/dummy',
                },
            },
        },
        {
            id: 4,
            parent: 1,
            droppable: false,
            text: 'Material 3',
            data: {
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                urls: {
                    de: 'http://localhost/dummy',
                    en: 'http://localhost/dummy',
                },
            },
        },
        {
            id: 5,
            parent: 0,
            droppable: true,
            text: 'Was ist ein VE?',
        },
        {
            id: 6,
            parent: 5,
            droppable: false,
            text: 'Material 4',
            data: {
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                urls: {
                    de: 'http://localhost/dummy',
                    en: 'http://localhost/dummy',
                },
            },
        },
    ]);

    useEffect(() => {
        fetchGET('/material_taxonomy', session?.accessToken).then((res) => {
            if (res.success) {
                setTreeData(res.taxonomy);
            }
        });
    }, [session]);

    // TODO, for now these are separate state vars, but it should be a Material object including the link and metadata
    const [currentMaterialInputName, setCurrentMaterialInputName] = useState<string>('');
    const [currentMaterialInputDescription, setCurrentMaterialInputDescription] =
        useState<string>('');
    const [currentMaterialInputLinkDe, setCurrentMaterialInputLinkDe] = useState<string>('');
    const [currentMaterialInputLinkEn, setCurrentMaterialInputLinkEn] = useState<string>('');

    const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

    const handleOpenMaterialDialog = () => {
        setIsMaterialDialogOpen(true);
    };

    const handleCloseMaterialDialog = () => {
        setIsMaterialDialogOpen(false);
    };

    const handleDrop = (newTree: any) => setTreeData(newTree);
    const [_, setOpen] = useState<boolean>(false);

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

    const handleCreateNewMaterial = () => {
        handleSubmit({
            parent: 0,
            droppable: false,
            text: currentMaterialInputName,
            data: {
                description: currentMaterialInputDescription,
                urls: {
                    de: currentMaterialInputLinkDe,
                    en: currentMaterialInputLinkEn,
                },
            },
        });
        setCurrentMaterialInputName('');
        setCurrentMaterialInputDescription('');
        setCurrentMaterialInputLinkDe('');
        setCurrentMaterialInputLinkEn('');
    };

    const handleSaveToBackend = () => {
        // TODO if possible validate structure to avoid crashing material site
        fetchPOST('/material_taxonomy', { taxonomy: treeData }, session?.accessToken);
        setSuccessPopupOpen(true);
    };

    const handleNodeChange = (id: NodeModel['id'], textUpdate: string, dataUpdate?: CustomData) => {
        const newTree = treeData.map((node) => {
            if (node.id === id) {
                return {
                    ...node,
                    text: textUpdate,
                    data: dataUpdate,
                };
            }

            return node;
        });

        setTreeData(newTree);
    };

    function triggerMBRSync() {
        // TODO confirmation dialog before actually syncing

        fetchPOST('/mbr_sync', {}, session?.accessToken);
        setSuccessPopupOpen(true);
    }

    return (
        <>
            <CustomHead pageTitle={t('edit')} pageSlug={`learning-material/edit`} />
            <div className="flex justify-center">
                <WhiteBox>
                    <div className="w-[60vw] h-[70vh] overflow-y-auto content-scrollbar">
                        {isLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <>
                                {!isUserAdmin ? (
                                    <div className="w-full h-full text-2xl flex items-center justify-center font-bold">
                                        Zugriff verweigert
                                    </div>
                                ) : (
                                    <>
                                        <BoxHeadline title="Lehrmaterialien bearbeiten" />
                                        <div className="mx-2 mt-2 px-1">Struktur:</div>
                                        <p className="mx-2 mb-2 px-1">
                                            Bubbles sind die höchste Ebene und nicht modifizierbar,
                                            auf erster Ebene keine anderen Knoten außer die Bubbles!
                                            Darunter beliebig viele Hierarchieebenen nebeneinander
                                            (= die Module), die wiederum die Lehrinhalt-Knoten
                                            enthalten. Bei korrekter Struktur ergibt sich eine
                                            maximale Baumtiefe von 3: Bubble - Hierarchieebene -
                                            Lehrinhalt
                                        </p>
                                        <DndProvider
                                            backend={MultiBackend}
                                            options={getBackendOptions()}
                                        >
                                            <div className="flex px-1 justify-between">
                                                <div className="flex">
                                                    <button
                                                        className="flex justify-center items-center bg-ve-collab-orange rounded-md px-2 py-1 mx-2 text-white"
                                                        onClick={handleSaveToBackend}
                                                    >
                                                        Änderungen speichern
                                                    </button>
                                                    <button
                                                        className="flex justify-center items-center border border-ve-collab-orange rounded-md px-2 py-1 mx-2 text-ve-collab-orange"
                                                        onClick={() =>
                                                            handleSubmit({
                                                                parent: 0,
                                                                droppable: true,
                                                                text: 'neue Ebene',
                                                            })
                                                        }
                                                    >
                                                        <RxPlus />
                                                        <div className="mx-1">
                                                            neue Hierarchieebene
                                                        </div>
                                                    </button>
                                                    <button
                                                        className="flex justify-center items-center border border-ve-collab-orange rounded-md px-2 py-1 mx-2 text-ve-collab-orange"
                                                        onClick={handleOpenMaterialDialog}
                                                    >
                                                        <RxPlus />
                                                        <div className="mx-1">neuer Lehrinhalt</div>
                                                    </button>
                                                </div>
                                                <button
                                                    className="flex justify-center items-center bg-ve-collab-orange rounded-md px-2 py-1 mx-2 text-white"
                                                    onClick={() => {
                                                        triggerMBRSync();
                                                    }}
                                                >
                                                    Metadaten mit MeinBildungsraum synchronisieren
                                                </button>
                                            </div>
                                            <div className="h-3/4 px-1 mx-2 my-1">
                                                <Tree
                                                    tree={treeData}
                                                    rootId={0}
                                                    render={(node: any, options) => (
                                                        <CustomNode
                                                            node={node}
                                                            {...options}
                                                            onDelete={handleDelete}
                                                            onCopy={handleCopy}
                                                            onChange={handleNodeChange}
                                                        />
                                                    )}
                                                    dragPreviewRender={(
                                                        monitorProps: DragLayerMonitorProps<CustomData>
                                                    ) => (
                                                        <CustomDragPreview
                                                            monitorProps={monitorProps}
                                                        />
                                                    )}
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
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </WhiteBox>
                <Dialog
                    isOpen={isMaterialDialogOpen}
                    title={'neuer Lehrinhalt'}
                    onClose={() => {
                        handleCloseMaterialDialog();
                    }}
                >
                    <div className="w-[40rem] h-[40rem] overflow-y-auto content-scrollbar relative">
                        <BoxHeadline title={'Name'} />
                        <div className="mb-10">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1"
                                placeholder="Name des Lehrinhalts"
                                value={currentMaterialInputName}
                                onChange={(e) => setCurrentMaterialInputName(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Kurzbeschreibung'} />
                        <div className="mb-10">
                            <textarea
                                rows={5}
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1"
                                placeholder="kurze Beschreibung für Seitleiste"
                                value={currentMaterialInputDescription}
                                onChange={(e) => setCurrentMaterialInputDescription(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Einbettungslink - deutsch'} />
                        <div className="mb-10">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1"
                                placeholder="Link zum deutschen Lehrinhalt, um ihn einzubetten"
                                value={currentMaterialInputLinkDe}
                                onChange={(e) => setCurrentMaterialInputLinkDe(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Einbettungslink - englisch'} />
                        <div className="mb-10">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1"
                                placeholder="Link zum englischen Lehrinhalt, um ihn einzubetten"
                                value={currentMaterialInputLinkEn}
                                onChange={(e) => setCurrentMaterialInputLinkEn(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Metadaten'} />
                        <div>TODO</div>
                        <div className="flex absolute bottom-0 w-full">
                            <button
                                className={
                                    'bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                                }
                                onClick={handleCloseMaterialDialog}
                            >
                                <span>Abbrechen</span>
                            </button>
                            <button
                                className={
                                    'bg-ve-collab-orange border border-gray-200 text-white py-3 px-6 rounded-lg shadow-xl'
                                }
                                onClick={() => {
                                    handleCreateNewMaterial();
                                    handleCloseMaterialDialog();
                                }}
                            >
                                <span>Einfügen</span>
                            </button>
                        </div>
                    </div>
                </Dialog>
            </div>
            {successPopupOpen && (
                <Alert
                    message={'Gespeichert'}
                    autoclose={2000}
                    onClose={() => setSuccessPopupOpen(false)}
                />
            )}
        </>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
