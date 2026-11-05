import { BackendFileNode, BackendFileShareLimits } from '@/interfaces/api/apiInterfaces';
import { fetchDELETE, fetchPOST, uploadGroupFiles } from '@/lib/backend';
import { useTranslation } from 'next-i18next';
import { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { UploadItem } from './UploadPanel';
import { formatBytes } from './fileUtils';

const KNOWN_ERROR_REASONS = [
    'node_doesnt_exist',
    'not_a_folder',
    'not_a_file',
    'folder_depth_exceeded',
    'file_too_large',
    'storage_quota_exceeded',
    'invalid_name',
    'name_already_exists',
    'invalid_move_target',
    'read_only_node',
    'insufficient_permission',
    'user_not_member_of_space',
    'space_doesnt_exist',
    'file_doesnt_exist',
];

/**
 * translate an error reason of the file share endpoints into a message,
 * filling in the configured limits
 */
export function useFileShareErrorMessage(limits: BackendFileShareLimits | null) {
    const { t } = useTranslation('community');

    return useCallback(
        (reason?: string): string => {
            if (reason && KNOWN_ERROR_REASONS.includes(reason)) {
                return t(`fileshare_error_${reason}`, {
                    depth: limits?.max_folder_depth,
                    size: formatBytes(limits?.max_file_size_bytes),
                    quota: formatBytes(limits?.max_space_storage_bytes),
                });
            }
            return t('fileshare_error_generic');
        },
        [t, limits]
    );
}

/**
 * display names of the given usernames. Unknown usernames are missing in the result.
 */
export function useDisplayNames(usernames: string[], accessToken?: string) {
    const key = useMemo(
        () => Array.from(new Set(usernames.filter((u) => u !== 'system'))).sort(),
        [usernames]
    );

    const { data } = useSWR(
        accessToken && key.length > 0 ? ['/profile_snippets', accessToken, key.join(',')] : null,
        ([url, token, joined]) => fetchPOST(url, { usernames: joined.split(',') }, token),
        { revalidateOnFocus: false, keepPreviousData: true }
    );

    return useMemo(() => {
        const names: Record<string, string> = {};
        (data?.user_snippets || []).forEach((snippet: any) => {
            const name = `${snippet.first_name || ''} ${snippet.last_name || ''}`.trim();
            names[snippet.username] = name || snippet.username;
        });
        return names;
    }, [data]);
}

/**
 * a message that hides itself after `timeout` ms
 */
export function useNotice(timeout = 6000) {
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), timeout);
        return () => clearTimeout(timer);
    }, [notice, timeout]);

    return { notice, showNotice: setNotice, clearNotice: () => setNotice(null) };
}

interface UploadQueueOptions {
    groupId: string;
    folderId: string | null;
    accessToken?: string;
    limits: BackendFileShareLimits | null;
    errorMessage: (reason?: string) => string;
    onUploaded: () => void; // after each finished file, e.g. to refresh the listing
}

/**
 * upload files one after another (keeps memory usage and progress reporting
 * simple) and track their progress for the `UploadPanel`
 */
export function useUploadQueue({
    groupId,
    folderId,
    accessToken,
    limits,
    errorMessage,
    onUploaded,
}: UploadQueueOptions) {
    const [uploads, setUploads] = useState<UploadItem[]>([]);

    const update = (id: string, changes: Partial<UploadItem>) =>
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)));

    const upload = async (files: File[]) => {
        if (!accessToken || files.length === 0) return;

        const items: UploadItem[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            progress: 0,
            status: 'pending',
        }));
        setUploads((prev) => [...prev.filter((u) => u.status !== 'done'), ...items]);

        for (const item of items) {
            if (limits && item.file.size > limits.max_file_size_bytes) {
                update(item.id, { status: 'error', error: errorMessage('file_too_large') });
                continue;
            }
            update(item.id, { status: 'uploading' });
            try {
                const response = await uploadGroupFiles(
                    groupId,
                    [item.file],
                    folderId,
                    accessToken,
                    (fraction) => update(item.id, { progress: fraction })
                );
                if (response.success) {
                    update(item.id, { status: 'done', progress: 1 });
                } else {
                    update(item.id, { status: 'error', error: errorMessage(response.reason) });
                }
            } catch (e) {
                update(item.id, { status: 'error', error: errorMessage() });
            }
            onUploaded();
        }
    };

    return { uploads, upload, clear: () => setUploads([]) };
}

/**
 * drag & drop of files from the desktop onto an element. The counter keeps the
 * overlay from flickering when dragging over child elements.
 */
export function useFileDrop(enabled: boolean, onDrop: (files: File[]) => void) {
    const [dragActive, setDragActive] = useState(false);
    const dragCounter = useRef(0);

    const handlers = {
        onDragEnter: (event: DragEvent) => {
            if (!enabled || !event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            dragCounter.current += 1;
            setDragActive(true);
        },
        onDragLeave: (event: DragEvent) => {
            if (!enabled) return;
            event.preventDefault();
            dragCounter.current -= 1;
            if (dragCounter.current <= 0) {
                dragCounter.current = 0;
                setDragActive(false);
            }
        },
        onDragOver: (event: DragEvent) => {
            if (!enabled) return;
            event.preventDefault();
        },
        onDrop: (event: DragEvent) => {
            if (!enabled) return;
            event.preventDefault();
            dragCounter.current = 0;
            setDragActive(false);
            const files = Array.from(event.dataTransfer.files || []);
            if (files.length > 0) onDrop(files);
        },
    };

    return { dragActive, handlers };
}

export type FileDialog =
    | { kind: 'none' }
    | { kind: 'create_folder' }
    | { kind: 'rename'; node: BackendFileNode }
    | { kind: 'move'; node: BackendFileNode }
    | { kind: 'copy'; node: BackendFileNode }
    | { kind: 'delete'; node: BackendFileNode };

interface FileActionsOptions {
    groupId: string;
    folderId: string | null;
    accessToken?: string;
    errorMessage: (reason?: string) => string;
    showNotice: (message: string) => void;
    onChanged: () => void; // e.g. to refresh the listing and the folder tree
}

/**
 * the modifying actions of the file share together with the state of their
 * dialogs: on success a dialog closes and `onChanged` is called, otherwise the
 * error is shown inside the dialog
 */
export function useFileActions({
    groupId,
    folderId,
    accessToken,
    errorMessage,
    showNotice,
    onChanged,
}: FileActionsOptions) {
    const { t } = useTranslation('community');
    const [dialog, setDialog] = useState<FileDialog>({ kind: 'none' });
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const open = (next: FileDialog) => {
        setDialogError(null);
        setDialog(next);
    };

    const close = () => {
        setDialog({ kind: 'none' });
        setDialogError(null);
        setSubmitting(false);
    };

    const submit = async (
        slug: string,
        body: Record<string, any>,
        successNotice?: (response: any) => string
    ) => {
        setSubmitting(true);
        const response = await fetchPOST(`/space_files/${slug}?id=${groupId}`, body, accessToken);
        setSubmitting(false);
        if (response.success) {
            close();
            onChanged();
            if (successNotice) showNotice(successNotice(response));
        } else {
            setDialogError(errorMessage(response.reason));
        }
    };

    return {
        dialog,
        dialogError,
        submitting,
        open,
        close,
        createFolder: (name: string) => submit('create_folder', { name, parent: folderId }),
        rename: (node: BackendFileNode, name: string) =>
            submit('rename', { node_id: node._id, name }),
        move: (node: BackendFileNode, target: string | null) =>
            submit('move', { node_id: node._id, parent: target }, () =>
                t('fileshare_moved', { name: node.name })
            ),
        copy: (node: BackendFileNode, target: string | null) =>
            submit('copy', { node_id: node._id, parent: target }, (response) =>
                t('fileshare_copied', { name: response.node?.name || node.name })
            ),
        remove: async (node: BackendFileNode) => {
            const response = await fetchDELETE(
                `/space_files/delete?id=${groupId}&node_id=${node._id}`,
                undefined,
                accessToken
            );
            close();
            if (response.success) {
                onChanged();
            } else {
                showNotice(errorMessage(response.reason));
            }
        },
    };
}
