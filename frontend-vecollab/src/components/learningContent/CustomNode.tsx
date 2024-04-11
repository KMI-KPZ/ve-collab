import React, { useState } from 'react';
import { IoMdTrash, IoMdCopy, IoMdCreate, IoMdCheckmark, IoMdClose } from 'react-icons/io';
import { useDragOver } from '@minoru/react-dnd-treeview';
import { RxDropdownMenu } from 'react-icons/rx';
import { FaFile } from 'react-icons/fa';
import Dialog from '../profile/Dialog';
import BoxHeadline from '../BoxHeadline';

export type CustomData = {
    description: string;
    url: string;
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

    const handleOpenMaterialDialog = () => {
        setCurrentMaterialInputName(text);
        setCurrentMaterialInputDescription(data?.description || '');
        setCurrentMaterialInputLink(data?.url || '');
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
        });

        setCurrentMaterialInputName('');
        setCurrentMaterialInputDescription('');
        setCurrentMaterialInputLink('');
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
                            {!['topBubble', 'leftBubble', 'bottomBubble', 'rightBubble'].includes(
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
                        <BoxHeadline title={'Einbettungslink'} />
                        <div className="mb-10">
                            <input
                                type="text"
                                className="w-full border border-gray-500 rounded-lg px-2 py-1 my-1"
                                placeholder="Link zum Lehrinhalt, um ihn einzubetten"
                                value={currentMaterialInputLink}
                                onChange={(e) => setCurrentMaterialInputLink(e.target.value)}
                            />
                        </div>
                        <BoxHeadline title={'Metadaten'} />
                        <div>TODO, potenziell aus AMB:</div>
                        <ul>
                            <li>@context: automatisch fix</li>
                            <li>id: link zum Lehrinhalt</li>
                            <li>type: automatisch LearningResource</li>
                            <li>name: Name (für Suche auf Metadaten)</li>
                            <li>description: Beschreibung (für Suche auf Metadaten)</li>
                            <li>about: Fach/Thema</li>
                            <li>keywords: Schlagworte</li>
                            <li>inLanguage: Deutsch (automatisch)</li>
                            <li>image: Thumbnail (ggf.)</li>
                            <li>
                                creator: Ersteller (Person, alternativ Institution referenziert)
                            </li>
                            <li>affiliation: Institution des Erstellers (nur bei Person)</li>
                            <li>dateCreated=datePublished: Datumsauswahl</li>
                            <li>isAccessibleForFree: true</li>
                            <li>license: ggf. Dropdown aus den verfügbaren Lizenztypen</li>
                            <li>
                                learningResourceType: Art des Lernmittels (Dropdown oder automatisch
                                fix)
                            </li>
                            <li>
                                audience: Zielgruppe (Educational Audience Role von LRMI, vermutl.
                                automatisch teacher)
                            </li>
                            <li>teaches: erreichbare Kompetenzen</li>
                            <li>assesses: feststellbare Kompetenzen (ggf. gleich mit teaches)</li>
                            <li>competencyRequired: benötigte Kompetenzen zur Nutzung</li>
                            <li>educationalLevel: automatisch University</li>
                            <li>interactivityType: automatisch active</li>
                        </ul>
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
