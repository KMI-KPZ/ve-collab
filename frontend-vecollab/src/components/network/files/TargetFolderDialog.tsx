import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Dialog from '@/components/profile/Dialog';
import { BackendFileNode, BackendFolderTreeNode } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';
import FileIcon from './FileIcon';
import FolderTree from './FolderTree';

interface Props {
    isOpen: boolean;
    title: string;
    submitLabel: string;
    node: BackendFileNode | null; //the node that is moved/copied
    tree: BackendFolderTreeNode[];
    treeLoading: boolean;
    currentFolderId: string | null;
    disallowCurrentFolder?: boolean; //for move: the node's own folder is not a valid target
    error?: string | null;
    isSubmitting?: boolean;
    onSubmit: (targetFolderId: string | null) => void;
    onClose: () => void;
}

/**
 * dialog to pick a target folder from the folder tree, used for moving and
 * copying nodes
 */
export default function TargetFolderDialog({
    isOpen,
    title,
    submitLabel,
    node,
    tree,
    treeLoading,
    currentFolderId,
    disallowCurrentFolder = false,
    error,
    isSubmitting = false,
    onSubmit,
    onClose,
}: Props) {
    const { t } = useTranslation(['community', 'common']);
    const [selected, setSelected] = useState<string | null>(currentFolderId);

    useEffect(() => {
        if (isOpen) setSelected(currentFolderId);
    }, [isOpen, currentFolderId]);

    // a folder cannot be moved into itself or any of its descendants
    const disabledIds = useMemo(() => {
        const ids = new Set<string>();
        if (!node || node.type !== 'folder') return ids;
        const collect = (folders: BackendFolderTreeNode[]) => {
            folders.forEach((folder) => {
                if (folder._id === node._id) {
                    const addSubtree = (f: BackendFolderTreeNode) => {
                        ids.add(f._id);
                        f.children.forEach(addSubtree);
                    };
                    addSubtree(folder);
                } else {
                    collect(folder.children);
                }
            });
        };
        collect(tree);
        return ids;
    }, [node, tree]);

    const canSubmit =
        !isSubmitting &&
        !(selected !== null && disabledIds.has(selected)) &&
        !(disallowCurrentFolder && selected === currentFolderId);

    return (
        <Dialog isOpen={isOpen} title={title} onClose={onClose}>
            <div className="w-[min(32rem,85vw)]">
                {node && (
                    <div className="flex items-center mb-3 text-sm text-gray-700 min-w-0">
                        <FileIcon node={node} className="mr-2 shrink-0" />
                        <span className="truncate" title={node.name}>
                            {node.name}
                        </span>
                    </div>
                )}
                <div className="text-sm text-gray-600 mb-1">
                    {t('fileshare_choose_target_folder')}
                </div>
                <div className="border border-gray-200 rounded-lg p-2 max-h-[45vh] overflow-y-auto content-scrollbar">
                    {treeLoading ? (
                        <LoadingAnimation size="small" />
                    ) : (
                        <FolderTree
                            tree={tree}
                            selectedId={selected}
                            onSelect={setSelected}
                            disabledIds={disabledIds}
                            hideSystemFolders
                            initiallyExpanded={tree.map((folder) => folder._id)}
                        />
                    )}
                </div>
                {disallowCurrentFolder && selected === currentFolderId && (
                    <div className="mt-2 text-sm text-gray-500">
                        {t('fileshare_already_in_folder')}
                    </div>
                )}
                {error && <div className="mt-2 text-sm text-red-700">{error}</div>}
                <div className="mt-4 flex justify-end gap-2">
                    <ButtonSecondary label={t('common:cancel')} onClick={onClose} />
                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => canSubmit && onSubmit(selected)}
                        className={`py-2 px-4 rounded-lg text-white ${
                            canSubmit
                                ? 'bg-ve-collab-orange hover:shadow-button-primary cursor-pointer'
                                : 'bg-ve-collab-orange-light cursor-default'
                        }`}
                    >
                        {submitLabel}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
