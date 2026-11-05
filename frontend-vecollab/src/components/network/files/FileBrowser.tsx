import ConfirmDialog from '@/components/common/dialogs/Confirm';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Portal from '@/components/common/Portal';
import { BackendFileNode, BackendFileSearchResult } from '@/interfaces/api/apiInterfaces';
import {
    fetchAuthenticatedFile,
    fetchGET,
    useGetFileShareLimits,
    useGetGroupFolder,
    useGetGroupFolderTree,
    useSearchGroupFiles,
} from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MdClose, MdCloudUpload } from 'react-icons/md';
import FileBreadcrumbs from './FileBreadcrumbs';
import FilePreviewDialog from './FilePreviewDialog';
import FileTable, { FileAction } from './FileTable';
import FileToolbar from './FileToolbar';
import FolderTree from './FolderTree';
import NameDialog from './NameDialog';
import StorageBar from './StorageBar';
import TargetFolderDialog from './TargetFolderDialog';
import UploadPanel from './UploadPanel';
import { isPreviewable, isSystemFolder, splitName } from './fileUtils';
import {
    useDisplayNames,
    useFileActions,
    useFileDrop,
    useFileShareErrorMessage,
    useNotice,
    useUploadQueue,
} from './hooks';

interface Props {
    groupId: string;
    canRead: boolean; // = space_acl "read_files"
    canWrite: boolean; // = space_acl "write_files"
}

export default function FileBrowser({ groupId, canRead, canWrite }: Props) {
    const { data: session } = useSession();
    const accessToken = session?.accessToken;
    const { t } = useTranslation(['community', 'common']);
    const router = useRouter();

    const folderId =
        typeof router.query.folder === 'string' && router.query.folder !== ''
            ? router.query.folder
            : null;
    const previewId = typeof router.query.preview === 'string' ? router.query.preview : null;

    const readableGroupId = canRead ? groupId : undefined;
    const {
        data: listing,
        isLoading: listingLoading,
        error: listingError,
        mutate: mutateListing,
    } = useGetGroupFolder(accessToken!, readableGroupId, folderId);
    const {
        data: tree,
        isLoading: treeLoading,
        mutate: mutateTree,
    } = useGetGroupFolderTree(accessToken!, readableGroupId);
    const { data: limits } = useGetFileShareLimits(accessToken!);

    // search (debounced)
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);
    const { data: searchResults, isLoading: searchLoading } = useSearchGroupFiles(
        accessToken!,
        readableGroupId,
        searchQuery
    );
    const isSearching = searchQuery !== '';
    const changeSearchInput = (value: string) => {
        setSearchInput(value);
        // clearing the search shows the folder again right away
        if (value.trim() === '') setSearchQuery('');
    };

    const visibleItems: BackendFileNode[] = useMemo(
        () => (isSearching ? searchResults : listing?.items || []),
        [isSearching, searchResults, listing]
    );
    const authorNames = useDisplayNames(
        visibleItems.map((item) => item.author),
        accessToken
    );

    const errorMessage = useFileShareErrorMessage(limits);
    const { notice, showNotice, clearNotice } = useNotice();

    const refresh = useCallback(() => {
        mutateListing();
        mutateTree();
    }, [mutateListing, mutateTree]);

    const actions = useFileActions({
        groupId,
        folderId,
        accessToken,
        errorMessage,
        showNotice,
        onChanged: refresh,
    });
    const { dialog } = actions;

    const inSystemFolder = !!listing?.folder && isSystemFolder(listing.folder);
    const canUploadHere = canWrite && !inSystemFolder && !isSearching;

    const uploadQueue = useUploadQueue({
        groupId,
        folderId,
        accessToken,
        limits,
        errorMessage,
        onUploaded: () => {
            mutateListing();
        },
    });
    const upload = async (files: File[]) => {
        if (!canUploadHere) {
            if (inSystemFolder) showNotice(errorMessage('read_only_node'));
            return;
        }
        await uploadQueue.upload(files);
        refresh();
    };
    const { dragActive, handlers: dropHandlers } = useFileDrop(canWrite, upload);

    // the preview is part of the url, the node is kept to render it right away
    const [previewNode, setPreviewNode] = useState<BackendFileNode | null>(null);

    const pushQuery = useCallback(
        (changes: { folder?: string | null; preview?: string | null }) => {
            const query: Record<string, string> = { groupId };
            const nextFolder = changes.folder === undefined ? folderId : changes.folder;
            const nextPreview = changes.preview === undefined ? previewId : changes.preview;
            if (nextFolder) query.folder = nextFolder;
            if (nextPreview) query.preview = nextPreview;
            router.push({ pathname: '/group/[groupId]/files', query }, undefined, {
                shallow: true,
            });
        },
        [router, groupId, folderId, previewId]
    );

    const navigateToFolder = useCallback(
        (id: string | null) => {
            setSearchInput('');
            setSearchQuery('');
            pushQuery({ folder: id, preview: null });
        },
        [pushQuery]
    );

    // open a preview that is referenced in the url (deep link / history)
    useEffect(() => {
        if (!previewId) {
            setPreviewNode(null);
            return;
        }
        if (previewNode && previewNode._id === previewId) return;
        const fromListing = visibleItems.find((item) => item._id === previewId);
        if (fromListing) {
            setPreviewNode(fromListing);
            return;
        }
        fetchGET(`/space_files/node?id=${groupId}&node_id=${previewId}`, accessToken).then(
            (data) => {
                if (data?.success && data.node?.type === 'file') setPreviewNode(data.node);
                else pushQuery({ preview: null });
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewId, visibleItems]);

    const openPreview = (node: BackendFileNode) => {
        setPreviewNode(node);
        pushQuery({ preview: node._id });
    };

    const closePreview = () => {
        setPreviewNode(null);
        pushQuery({ preview: null });
    };

    const download = async (node: BackendFileNode) => {
        const response = await fetchAuthenticatedFile(`/uploads/${node.file_id}`, accessToken);
        if (!response.ok) {
            showNotice(
                errorMessage(response.status === 403 ? 'insufficient_permission' : undefined)
            );
            return;
        }
        const href = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = href;
        link.download = node.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
    };

    const openNode = (node: BackendFileNode) => {
        if (node.type === 'folder') {
            navigateToFolder(node._id);
        } else if (isPreviewable(node)) {
            openPreview(node);
        } else {
            download(node);
        }
    };

    const handleAction = (action: FileAction, node: BackendFileNode) => {
        switch (action) {
            case 'preview':
                openPreview(node);
                break;
            case 'download':
                download(node);
                break;
            default:
                actions.open({ kind: action, node });
        }
    };

    if (!canRead) {
        return (
            <div className="mx-4 my-8 text-gray-600">{t('fileshare_insufficient_permissions')}</div>
        );
    }

    const previewableSiblings = visibleItems.filter(
        (item) => item.type === 'file' && isPreviewable(item)
    );
    const pathIds = (listing?.path || []).map((snippet) => snippet._id);
    const listingErrorReason = listingError?.apiResponse?.reason as string | undefined;

    const renderListing = () => {
        if (listingError && !isSearching) {
            return (
                <div className="py-8 text-center text-gray-600">
                    <div className="mb-2">{errorMessage(listingErrorReason)}</div>
                    <button
                        type="button"
                        className="text-ve-collab-blue underline cursor-pointer"
                        onClick={() => navigateToFolder(null)}
                    >
                        {t('fileshare_back_to_root')}
                    </button>
                </div>
            );
        }
        if (
            (listingLoading && !listing && !isSearching) ||
            (isSearching && searchLoading && searchResults.length === 0)
        ) {
            return <LoadingAnimation />;
        }
        return (
            <FileTable
                items={
                    isSearching
                        ? (searchResults as BackendFileSearchResult[])
                        : listing?.items || []
                }
                authorNames={authorNames}
                canWrite={canWrite}
                onOpen={openNode}
                onAction={handleAction}
                onNavigate={navigateToFolder}
                showPath={isSearching}
                emptyMessage={
                    isSearching
                        ? t('fileshare_no_search_results')
                        : canUploadHere
                        ? t('fileshare_empty_folder_upload_hint')
                        : t('fileshare_empty_folder')
                }
            />
        );
    };

    return (
        <div className="relative" {...dropHandlers}>
            <FileToolbar
                canUpload={canUploadHere}
                uploadDisabledHint={
                    !canWrite
                        ? t('fileshare_no_write_permission')
                        : inSystemFolder
                        ? t('fileshare_post_files_folder_hint')
                        : ''
                }
                searchInput={searchInput}
                onSearchInputChange={changeSearchInput}
                onUpload={upload}
                onCreateFolder={() => actions.open({ kind: 'create_folder' })}
            />

            {notice && (
                <div className="mb-3 flex items-start justify-between rounded-lg border border-ve-collab-blue-light bg-ve-collab-blue-light/30 px-3 py-2 text-sm text-slate-900">
                    <span>{notice}</span>
                    <button
                        type="button"
                        className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        onClick={clearNotice}
                        aria-label={t('common:close')}
                    >
                        <MdClose />
                    </button>
                </div>
            )}

            <UploadPanel uploads={uploadQueue.uploads} onClear={uploadQueue.clear} />

            <div className="flex gap-4 min-h-[60vh]">
                {/* folder tree sidebar */}
                <aside className="hidden lg:block w-48 shrink-0">
                    <div className="sticky top-4 max-h-[70vh] overflow-y-auto content-scrollbar pr-1">
                        {treeLoading ? (
                            <LoadingAnimation size="small" />
                        ) : (
                            <FolderTree
                                tree={tree}
                                selectedId={isSearching ? '' : folderId}
                                onSelect={navigateToFolder}
                                initiallyExpanded={pathIds}
                            />
                        )}
                    </div>
                    {listing?.storage && (
                        <div className="mt-4 pr-2">
                            <StorageBar storage={listing.storage} />
                        </div>
                    )}
                </aside>

                {/* main area */}
                <div className="min-w-0 grow">
                    {isSearching ? (
                        <div className="mb-2 text-sm text-gray-600">
                            {t('fileshare_search_results_for', { query: searchQuery })}
                            {searchLoading
                                ? ` (${t('common:loading')})`
                                : ` (${searchResults.length})`}
                        </div>
                    ) : (
                        <div className="mb-2">
                            <FileBreadcrumbs
                                path={listing?.path || []}
                                onNavigate={navigateToFolder}
                            />
                        </div>
                    )}

                    {inSystemFolder && !isSearching && (
                        <div className="mb-2 rounded-lg bg-ve-collab-blue-light/30 px-3 py-2 text-sm text-slate-800">
                            {t('fileshare_post_files_folder_hint')}
                        </div>
                    )}

                    {renderListing()}
                </div>
            </div>

            {/* drag & drop overlay */}
            {dragActive && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-lg border-4 border-dashed border-ve-collab-blue bg-white/90 text-ve-collab-blue pointer-events-none">
                    <MdCloudUpload size={56} />
                    <div className="mt-2 font-semibold">
                        {canUploadHere
                            ? t('fileshare_drop_to_upload')
                            : t('fileshare_drop_not_allowed')}
                    </div>
                </div>
            )}

            {/* dialogs and the preview are portaled to <body>: the surrounding
                WhiteBox has a drop-shadow (css filter), which would otherwise
                confine their fixed overlays to the box instead of the viewport */}
            <Portal>
                <NameDialog
                    isOpen={dialog.kind === 'create_folder'}
                    title={t('fileshare_new_folder')}
                    label={t('fileshare_folder_name')}
                    submitLabel={t('fileshare_create')}
                    maxLength={limits?.max_name_length}
                    error={actions.dialogError}
                    isSubmitting={actions.submitting}
                    onSubmit={actions.createFolder}
                    onClose={actions.close}
                />
                <NameDialog
                    isOpen={dialog.kind === 'rename'}
                    title={t('fileshare_rename')}
                    label={t('fileshare_new_name')}
                    submitLabel={t('common:save')}
                    initialValue={dialog.kind === 'rename' ? dialog.node.name : ''}
                    selectStemOnly={
                        dialog.kind === 'rename' &&
                        dialog.node.type === 'file' &&
                        splitName(dialog.node.name).extension !== ''
                    }
                    maxLength={limits?.max_name_length}
                    error={actions.dialogError}
                    isSubmitting={actions.submitting}
                    onSubmit={(name) =>
                        dialog.kind === 'rename' && actions.rename(dialog.node, name)
                    }
                    onClose={actions.close}
                />
                <TargetFolderDialog
                    isOpen={dialog.kind === 'move'}
                    title={t('fileshare_move_to')}
                    submitLabel={t('fileshare_move')}
                    node={dialog.kind === 'move' ? dialog.node : null}
                    tree={tree}
                    treeLoading={treeLoading}
                    currentFolderId={dialog.kind === 'move' ? dialog.node.parent : null}
                    disallowCurrentFolder
                    error={actions.dialogError}
                    isSubmitting={actions.submitting}
                    onSubmit={(target) =>
                        dialog.kind === 'move' && actions.move(dialog.node, target)
                    }
                    onClose={actions.close}
                />
                <TargetFolderDialog
                    isOpen={dialog.kind === 'copy'}
                    title={t('fileshare_copy_to')}
                    submitLabel={t('fileshare_copy')}
                    node={dialog.kind === 'copy' ? dialog.node : null}
                    tree={tree}
                    treeLoading={treeLoading}
                    currentFolderId={isSearching || inSystemFolder ? null : folderId}
                    error={actions.dialogError}
                    isSubmitting={actions.submitting}
                    onSubmit={(target) =>
                        dialog.kind === 'copy' && actions.copy(dialog.node, target)
                    }
                    onClose={actions.close}
                />
                {dialog.kind === 'delete' && (
                    <ConfirmDialog
                        message={
                            dialog.node.type === 'folder'
                                ? t('fileshare_confirm_delete_folder', { name: dialog.node.name })
                                : t('fileshare_confirm_delete_file', { name: dialog.node.name })
                        }
                        callback={(proceed) => {
                            if (proceed) actions.remove(dialog.node);
                            else actions.close();
                        }}
                    />
                )}
                <FilePreviewDialog
                    node={previewNode}
                    siblings={previewableSiblings}
                    onSelect={openPreview}
                    onDownload={download}
                    onClose={closePreview}
                />
            </Portal>
        </div>
    );
}
