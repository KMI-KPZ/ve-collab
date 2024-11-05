import React, { useState } from 'react';
import { IoMdTrash, IoMdCopy, IoMdCreate, IoMdCheckmark, IoMdClose } from 'react-icons/io';
import { useDragOver } from '@minoru/react-dnd-treeview';
import { RxDropdownMenu } from 'react-icons/rx';
import { FaFile } from 'react-icons/fa';
import Dialog from '../profile/Dialog';
import BoxHeadline from '../common/BoxHeadline';

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
    url: string;
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

type Props = {
    node: NodeModel<CustomData>;
    depth: number;
    isOpen: boolean;
    onToggle: (id: NodeModel['id']) => void;
    onDelete: (id: NodeModel['id']) => void;
    onCopy: (id: NodeModel['id']) => void;
    onChange: (id: NodeModel['id'], textUpdate: string, dataUpdate?: CustomData) => void;
};

export const CustomNode: React.FC<Props> = (props) => {
    const [hover, setHover] = useState<boolean>(false);
    const { id, parent, droppable, text, data } = props.node;
    const [visibleInput, setVisibleInput] = useState(false);
    const [labelText, setLabelText] = useState(text);
    const indent = props.depth * 24;

    // TODO, for now these are separate state vars, but it should be a Material object including the link and metadata
    const [currentMaterialInputName, setCurrentMaterialInputName] = useState<string>('');
    const [currentMaterialInputDescription, setCurrentMaterialInputDescription] =
        useState<string>('');
    const [currentMaterialInputLink, setCurrentMaterialInputLink] = useState<string>('');

    const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

    const [currentMaterialMetadata, setCurrentMaterialMetadata] = useState<Metadata>({
        name: '',
    });

    const handleOpenMaterialDialog = () => {
        setCurrentMaterialInputName(text);
        setCurrentMaterialInputDescription(data?.description || '');
        setCurrentMaterialInputLink(data?.url || '');
        setCurrentMaterialMetadata(data?.metadata || { name: '' });
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

    const handleEditMaterial = () => {
        setLabelText(currentMaterialInputName);
        props.onChange(id, currentMaterialInputName, {
            description: currentMaterialInputDescription,
            url: currentMaterialInputLink,
            metadata: currentMaterialMetadata,
            mbr_id: data?.mbr_id,
        });

        setCurrentMaterialInputName('');
        setCurrentMaterialInputDescription('');
        setCurrentMaterialInputLink('');
        setCurrentMaterialMetadata({ name: '' });
    };

    const handleSubmit = () => {
        setVisibleInput(false);
        props.onChange(id, labelText);
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
                    <div className="cursor-pointer" onClick={handleToggle}>
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
                            <p className="cursor-pointer" onClick={handleOpenMaterialDialog}>
                                {props.node.text}
                            </p>
                        </div>
                    )}
                    {hover && (
                        <div className="flex ml-10">
                            {/* the bubbles are immutable in the taxonomy, because changing their names or deleting them crashes the structure*/}
                            {!['top-bubble', 'left-bubble', 'bottom-bubble', 'right-bubble'].includes(
                                text
                            ) && (
                                <>
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
                                </>
                            )}
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
                <div className="">
                    <div className="w-[40rem] h-[40rem] overflow-y-auto content-scrollbar ">
                        <BoxHeadline title={'Name'} />
                        <div className="mb-10">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                placeholder="Name des Lehrinhalts"
                                value={currentMaterialInputName}
                                onChange={(e) => setCurrentMaterialInputName(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Kurzbeschreibung'} />
                        <div className="mb-10">
                            <textarea
                                rows={5}
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                placeholder="kurze Beschreibung für Seitleiste"
                                value={currentMaterialInputDescription}
                                onChange={(e) => setCurrentMaterialInputDescription(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Einbettungslink'} />
                        <div className="mb-10">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                placeholder="Link zum Lehrinhalt, um ihn einzubetten"
                                value={currentMaterialInputLink}
                                onChange={(e) => setCurrentMaterialInputLink(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Metadaten'} />
                        <div className="mb-4 mt-4">
                            <div className="mx-2 px-1 my-1 font-bold">Name</div>
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                placeholder="...der Lehrressource in MeinBildungsraum"
                                value={currentMaterialMetadata.name}
                                onChange={(e) =>
                                    setCurrentMaterialMetadata({
                                        ...currentMaterialMetadata,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="mb-4 mt-4">
                            <div className="mx-2 px-1 my-1 font-bold">Beschreibung</div>
                            <textarea
                                rows={2}
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                placeholder="...der Lehrressource in MeinBildungsraum"
                                value={currentMaterialMetadata.description}
                                onChange={(e) =>
                                    setCurrentMaterialMetadata({
                                        ...currentMaterialMetadata,
                                        description: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="mb-4 mt-4">
                            <div className="mx-2 px-1 my-1 font-bold">Schlagworte</div>
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                placeholder="mehrere durch Komma trennen"
                                value={currentMaterialMetadata.keywords?.join(', ')}
                                onChange={(e) =>
                                    setCurrentMaterialMetadata({
                                        ...currentMaterialMetadata,
                                        keywords: e.target.value.split(', '),
                                    })
                                }
                            />
                        </div>
                        <div className="mb-4 mt-4">
                            <div className="mx-2 px-1 my-1 font-bold">Ersteller:in</div>
                            <div className="flex">
                                <div className="mx-4">
                                    <label htmlFor="creator">Person</label>
                                    <input
                                        type="radio"
                                        name="creator"
                                        value="Person"
                                        checked={currentMaterialMetadata.creator?.type === 'Person'}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    type: e.target.value as
                                                        | 'Person'
                                                        | 'Organisation',
                                                },
                                            })
                                        }
                                        className="mx-1"
                                    />
                                </div>
                                <div className="mx-4">
                                    <label htmlFor="creator">Organisation</label>
                                    <input
                                        type="radio"
                                        name="creator"
                                        value="Organisation"
                                        checked={
                                            currentMaterialMetadata.creator?.type === 'Organisation'
                                        }
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    type: e.target.value as
                                                        | 'Person'
                                                        | 'Organisation',
                                                },
                                            })
                                        }
                                        className="mx-1"
                                    />
                                </div>
                            </div>
                            {currentMaterialMetadata?.creator?.type === 'Person' && (
                                <>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                        placeholder="Vorname Nachname (ohne Titel)"
                                        value={currentMaterialMetadata.creator.name}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    ...currentMaterialMetadata.creator,
                                                    name: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                    <input
                                        type="text"
                                        className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                        placeholder="optional, ORCiD, GND, Wikidata oder ROR URL"
                                        value={currentMaterialMetadata.creator.uri}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    ...currentMaterialMetadata.creator,
                                                    uri: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                    <input
                                        type="text"
                                        className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                        placeholder="optional, Affiliation der Ersteller:in (Institutionsname)"
                                        value={currentMaterialMetadata.creator.affiliation}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    ...currentMaterialMetadata.creator,
                                                    affiliation: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                    <input
                                        type="text"
                                        className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                        placeholder="optional, Affiliation der Ersteller:in (ORCiD, GND, Wikidata oder ROR URL der Institution)"
                                        value={currentMaterialMetadata.creator.affiliationUri}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    ...currentMaterialMetadata.creator,
                                                    affiliationUri: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                </>
                            )}
                            {currentMaterialMetadata?.creator?.type === 'Organisation' && (
                                <>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                        placeholder="Organisationsname"
                                        value={currentMaterialMetadata.creator.name}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    ...currentMaterialMetadata.creator,
                                                    name: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                    <input
                                        type="text"
                                        className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                        placeholder="optional, ORCiD, GND, Wikidata oder ROR URL"
                                        value={currentMaterialMetadata.creator.uri}
                                        onChange={(e) =>
                                            setCurrentMaterialMetadata({
                                                ...currentMaterialMetadata,
                                                creator: {
                                                    ...currentMaterialMetadata.creator,
                                                    uri: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                </>
                            )}
                        </div>
                        <div className="mb-4 mt-4">
                            <div className="mx-2 px-1 my-1 font-bold">
                                Erstellungs- und Publikationsdatum
                            </div>
                            <input
                                type="date"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1 mx-2"
                                value={currentMaterialMetadata.date}
                                onChange={(e) =>
                                    setCurrentMaterialMetadata({
                                        ...currentMaterialMetadata,
                                        date: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="flex w-full mt-5">
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
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                handleEditMaterial();
                                handleCloseMaterialDialog();
                            }}
                        >
                            <span>Ändern</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
