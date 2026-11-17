import { BackendChatFile } from '@/interfaces/api/apiInterfaces';
import { useGetChatroomFiles } from '@/lib/backend';
import { format, parseISO } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { MdMyLocation } from 'react-icons/md';
import LoadingAnimation from '../common/LoadingAnimation';
import FileIcon from '../network/files/FileIcon';
import StorageBar from '../network/files/StorageBar';
import { formatBytes } from '../network/files/fileUtils';
import ChatSidePanel from './ChatSidePanel';
import { toPreviewableFile, useDateLocale } from './chatUtils';

interface Props {
    roomId: string;
    fileCount: number; // files of the loaded messages, the list is refetched when it changes
    senderName: (username: string) => string;
    onOpenFile: (file: BackendChatFile) => void;
    onJump: (messageId: string) => void;
    onClose: () => void;
}

export default function ChatFiles({
    roomId,
    fileCount,
    senderName,
    onOpenFile,
    onJump,
    onClose,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const locale = useDateLocale();

    const {
        data: files,
        storage,
        isLoading,
        mutate,
    } = useGetChatroomFiles(session!.accessToken, roomId);
    useEffect(() => {
        mutate();
    }, [fileCount, mutate]);

    return (
        <ChatSidePanel title={t('chat_files')} onClose={onClose}>
            {isLoading ? (
                <LoadingAnimation size="small" />
            ) : files.length === 0 ? (
                <p className="px-1 text-sm text-gray-500">{t('chat_no_files')}</p>
            ) : (
                <ul className="space-y-1">
                    {files.map((file) => (
                        <li
                            key={file.file_id}
                            className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-gray-50"
                        >
                            <FileIcon node={toPreviewableFile(file)} className="shrink-0" />
                            <button
                                type="button"
                                onClick={() => onOpenFile(file)}
                                className="min-w-0 grow text-left cursor-pointer"
                                title={file.file_name}
                            >
                                <div className="truncate text-sm text-slate-900 hover:underline">
                                    {file.file_name}
                                </div>
                                <div className="truncate text-xs text-gray-500">
                                    {senderName(file.sender)} ·{' '}
                                    {format(parseISO(file.creation_date), 'P', { locale })} ·{' '}
                                    {formatBytes(file.size)}
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => onJump(file.message_id)}
                                className="shrink-0 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-ve-collab-blue cursor-pointer"
                                title={t('chat_jump_to_message')}
                                aria-label={t('chat_jump_to_message')}
                            >
                                <MdMyLocation size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {storage && (
                <div className="mt-4 px-1">
                    <StorageBar storage={storage} label={t('chat_storage')} />
                </div>
            )}
        </ChatSidePanel>
    );
}
