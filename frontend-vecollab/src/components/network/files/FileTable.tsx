import Dropdown from '@/components/common/Dropdown';
import Timestamp from '@/components/common/Timestamp';
import { BackendFileNode, BackendFilePathSnippet } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { type JSX } from 'react';
import {
    MdContentCopy,
    MdDeleteOutline,
    MdDownload,
    MdDriveFileMove,
    MdDriveFileRenameOutline,
    MdOpenInNew,
    MdVisibility,
} from 'react-icons/md';
import FileIcon from './FileIcon';
import {
    SYSTEM_FOLDER_POST_FILES,
    formatBytes,
    isPostFile,
    isPreviewable,
    isReadOnly,
    isSystemFolder,
} from './fileUtils';

export type FileAction = 'preview' | 'download' | 'rename' | 'move' | 'copy' | 'delete';

export interface FileTableItem extends BackendFileNode {
    path?: BackendFilePathSnippet[]; //parent path, only present for search results
}

interface Props {
    items: FileTableItem[];
    authorNames: Record<string, string>;
    canWrite: boolean;
    onOpen: (node: BackendFileNode) => void;
    onAction: (action: FileAction, node: BackendFileNode) => void;
    onNavigate?: (folderId: string | null) => void;
    showPath?: boolean; // only for search results
    emptyMessage: string;
}

/**
 * the list view of a folder (or of search results)
 */
export default function FileTable({
    items,
    authorNames,
    canWrite,
    onOpen,
    onAction,
    onNavigate,
    showPath = false,
    emptyMessage,
}: Props) {
    const { t } = useTranslation('community');

    const displayName = (node: BackendFileNode) =>
        node.type === 'folder' && node.system === SYSTEM_FOLDER_POST_FILES
            ? t('fileshare_post_files_folder')
            : node.name;

    const pathLabel = (snippet: BackendFilePathSnippet) =>
        snippet.system === SYSTEM_FOLDER_POST_FILES
            ? t('fileshare_post_files_folder')
            : snippet.name;

    const actionsFor = (node: BackendFileNode) => {
        const options: {
            value: FileAction;
            label: string;
            icon: JSX.Element;
            liClasses?: string;
        }[] = [];

        if (node.type === 'file') {
            if (isPreviewable(node)) {
                options.push({
                    value: 'preview',
                    label: t('fileshare_preview'),
                    icon: <MdVisibility />,
                });
            }
            options.push({
                value: 'download',
                label: t('fileshare_download'),
                icon: <MdDownload />,
            });
            if (canWrite) {
                options.push({
                    value: 'copy',
                    label: t('fileshare_copy_to'),
                    icon: <MdContentCopy />,
                });
            }
        }

        if (!isReadOnly(node) && canWrite) {
            options.push({
                value: 'rename',
                label: t('fileshare_rename'),
                icon: <MdDriveFileRenameOutline />,
            });
            options.push({
                value: 'move',
                label: t('fileshare_move_to'),
                icon: <MdDriveFileMove />,
            });
            options.push({
                value: 'delete',
                label: t('fileshare_delete'),
                icon: <MdDeleteOutline />,
                liClasses: 'text-red-700',
            });
        }

        return options;
    };

    if (items.length === 0) {
        return <div className="py-12 text-center text-gray-500">{emptyMessage}</div>;
    }

    // no overflow container here: it would clip the row action dropdowns.
    // narrow screens hide columns instead (see the responsive table-cell classes)
    return (
        <div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pl-2 pr-2 font-medium">{t('fileshare_col_name')}</th>
                        {showPath && (
                            <th className="py-2 px-2 font-medium hidden md:table-cell">
                                {t('fileshare_col_location')}
                            </th>
                        )}
                        <th className="py-2 px-2 font-medium hidden md:table-cell">
                            {t('fileshare_col_modified')}
                        </th>
                        <th className="py-2 px-2 font-medium hidden lg:table-cell">
                            {t('fileshare_col_author')}
                        </th>
                        <th className="py-2 px-2 font-medium text-right hidden sm:table-cell">
                            {t('fileshare_col_size')}
                        </th>
                        <th className="py-2 px-2 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((node) => {
                        const options = actionsFor(node);
                        return (
                            <tr
                                key={node._id}
                                className="border-b border-gray-100 hover:bg-gray-50 group"
                                onDoubleClick={() => onOpen(node)}
                            >
                                <td className="py-1.5 pl-2 pr-2 max-w-0 w-full">
                                    <div className="flex items-center min-w-0">
                                        <FileIcon node={node} className="shrink-0 mr-2" />
                                        <button
                                            type="button"
                                            className="truncate text-left text-slate-900 hover:underline cursor-pointer"
                                            title={node.name}
                                            onClick={() => onOpen(node)}
                                        >
                                            {displayName(node)}
                                        </button>
                                        {isSystemFolder(node) && (
                                            <span
                                                className="ml-2 shrink-0 rounded-full bg-ve-collab-blue-light/50 px-2 py-0.5 text-xs text-ve-collab-blue"
                                                title={t('fileshare_post_files_folder_hint')}
                                            >
                                                {t('fileshare_system')}
                                            </span>
                                        )}
                                        {isPostFile(node) && (
                                            <span
                                                className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 flex items-center"
                                                title={t('fileshare_post_file_hint')}
                                            >
                                                {t('fileshare_from_post')}
                                                {node.post_id && (
                                                    <Link
                                                        href={`/post/${node.post_id}`}
                                                        className="ml-1 hover:text-ve-collab-blue"
                                                        title={t('fileshare_open_post')}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MdOpenInNew />
                                                    </Link>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                {showPath && (
                                    <td className="py-1.5 px-2 whitespace-nowrap text-gray-500 hidden md:table-cell">
                                        <button
                                            type="button"
                                            className="hover:underline cursor-pointer truncate max-w-[18rem]"
                                            onClick={() =>
                                                onNavigate &&
                                                onNavigate(
                                                    node.path && node.path.length > 0
                                                        ? node.path[node.path.length - 1]._id
                                                        : null
                                                )
                                            }
                                        >
                                            {[
                                                t('fileshare'),
                                                ...(node.path || []).map(pathLabel),
                                            ].join(' / ')}
                                        </button>
                                    </td>
                                )}
                                <td className="py-1.5 px-2 whitespace-nowrap text-gray-500 hidden md:table-cell">
                                    <Timestamp timestamp={node.modified} relative showTitle />
                                </td>
                                <td className="py-1.5 px-2 whitespace-nowrap text-gray-500 hidden lg:table-cell">
                                    <span className="truncate inline-block max-w-[12rem] align-bottom">
                                        {authorNames[node.author] || node.author}
                                    </span>
                                </td>
                                <td className="py-1.5 px-2 whitespace-nowrap text-right text-gray-500 hidden sm:table-cell">
                                    {node.type === 'file' ? formatBytes(node.size) : ''}
                                </td>
                                <td className="py-0 px-1 text-right">
                                    {options.length > 0 && (
                                        <Dropdown
                                            options={options}
                                            onSelect={(value) =>
                                                onAction(value as FileAction, node)
                                            }
                                            ulClasses="w-48"
                                        />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
