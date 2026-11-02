import { BackendFolderTreeNode } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import {
    MdFolder,
    MdFolderSpecial,
    MdHome,
    MdKeyboardArrowDown,
    MdKeyboardArrowRight,
} from 'react-icons/md';
import { SYSTEM_FOLDER_POST_FILES } from './fileUtils';

interface Props {
    tree: BackendFolderTreeNode[];
    selectedId: string | null; // currently selected folder id, or null if root folder
    onSelect: (folderId: string | null) => void;
    disabledIds?: Set<string>; // folders that cannot be selected (e.g. when moving)
    hideSystemFolders?: boolean;
    initiallyExpanded?: string[]; // folder id's that should be expanded initially, e.g. current path
    className?: string;
}

/**
 * a collapsible tree of the folders of a group's file share, used as the
 * navigation sidebar and as target picker in the move/copy dialogs
 */
export default function FolderTree({
    tree,
    selectedId,
    onSelect,
    disabledIds,
    hideSystemFolders = false,
    initiallyExpanded = [],
    className = '',
}: Props) {
    const { t } = useTranslation('community');
    const [expanded, setExpanded] = useState<Set<string>>(new Set(initiallyExpanded));

    // keep the path to the current folder expanded when it changes
    useEffect(() => {
        setExpanded((prev) => {
            const next = new Set(prev);
            initiallyExpanded.forEach((id) => next.add(id));
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initiallyExpanded.join(',')]);

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const folderLabel = (folder: BackendFolderTreeNode) =>
        folder.system === SYSTEM_FOLDER_POST_FILES ? t('fileshare_post_files_folder') : folder.name;

    const renderFolder = (folder: BackendFolderTreeNode, depth: number) => {
        if (hideSystemFolders && folder.system) return null;

        const children = folder.children.filter((child) => !(hideSystemFolders && child.system));
        const hasChildren = children.length > 0;
        const isExpanded = expanded.has(folder._id);
        const isSelected = selectedId === folder._id;
        const isDisabled = disabledIds?.has(folder._id) ?? false;

        return (
            <li key={folder._id}>
                <div
                    className={`flex items-center rounded-md pr-2 py-1 text-sm select-none ${
                        isSelected
                            ? 'bg-ve-collab-blue text-white'
                            : isDisabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-ve-collab-blue-light/40 cursor-pointer'
                    }`}
                    style={{ paddingLeft: `${depth * 14 + 4}px` }}
                    title={folder.name}
                >
                    <button
                        type="button"
                        className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                            hasChildren ? 'cursor-pointer' : 'invisible'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggle(folder._id);
                        }}
                        aria-label={isExpanded ? t('fileshare_collapse') : t('fileshare_expand')}
                    >
                        {isExpanded ? <MdKeyboardArrowDown /> : <MdKeyboardArrowRight />}
                    </button>
                    <button
                        type="button"
                        className={`flex items-center min-w-0 grow ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        disabled={isDisabled}
                        onClick={() => onSelect(folder._id)}
                    >
                        {folder.system ? (
                            <MdFolderSpecial
                                className={`shrink-0 mr-1.5 ${
                                    isSelected ? 'text-white' : 'text-ve-collab-blue'
                                }`}
                                size={18}
                            />
                        ) : (
                            <MdFolder
                                className={`shrink-0 mr-1.5 ${
                                    isSelected ? 'text-white' : 'text-ve-collab-orange'
                                }`}
                                size={18}
                            />
                        )}
                        <span className="truncate">{folderLabel(folder)}</span>
                    </button>
                </div>
                {hasChildren && isExpanded && (
                    <ul>{children.map((child) => renderFolder(child, depth + 1))}</ul>
                )}
            </li>
        );
    };

    return (
        <ul className={className}>
            <li>
                <button
                    type="button"
                    className={`w-full flex items-center rounded-md px-2 py-1 text-sm cursor-pointer ${
                        selectedId === null
                            ? 'bg-ve-collab-blue text-white'
                            : 'text-gray-700 hover:bg-ve-collab-blue-light/40'
                    }`}
                    onClick={() => onSelect(null)}
                >
                    <MdHome className="shrink-0 mr-1.5" size={18} />
                    <span className="truncate font-semibold">{t('fileshare')}</span>
                </button>
            </li>
            {tree.map((folder) => renderFolder(folder, 1))}
        </ul>
    );
}
