import { BackendChatFile, BackendChatMessage } from '@/interfaces/api/apiInterfaces';
import { format, parseISO } from 'date-fns';
import FileIcon from '../network/files/FileIcon';
import { formatBytes } from '../network/files/fileUtils';
import { messageElementId, toPreviewableFile, useDateLocale } from './chatUtils';

interface Props {
    message: BackendChatMessage;
    own: boolean;
    senderName?: string; // shown above the first of consecutive messages of a sender in group chats
    highlighted?: boolean; // e.g. after jumping to the message from the search
    onOpenFile: (file: BackendChatFile) => void;
}

export default function ChatMessage({
    message,
    own,
    senderName,
    highlighted = false,
    onOpenFile,
}: Props) {
    const locale = useDateLocale();
    const date = parseISO(message.creation_date);

    return (
        <li
            id={messageElementId(message._id)}
            className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}
        >
            {senderName && (
                <span className="mx-2 mt-2 text-xs font-semibold text-gray-600">{senderName}</span>
            )}
            <div
                className={`m-1 max-w-4xl rounded-md p-2 break-words whitespace-pre-wrap transition-shadow duration-500 ${
                    own ? 'bg-ve-collab-blue/50' : 'bg-gray-200'
                } ${highlighted ? 'ring-2 ring-ve-collab-orange' : ''}`}
            >
                {message.message && <p>{message.message}</p>}
                {message.files.length > 0 && (
                    <ul className={`space-y-1 whitespace-normal ${message.message ? 'mt-1' : ''}`}>
                        {message.files.map((file) => (
                            <li key={file.file_id}>
                                <button
                                    type="button"
                                    onClick={() => onOpenFile(file)}
                                    className="flex w-full max-w-xs items-center gap-2 rounded bg-white/70 px-2 py-1 text-left text-sm hover:bg-white cursor-pointer"
                                    title={file.file_name}
                                >
                                    <FileIcon
                                        node={toPreviewableFile(file)}
                                        size={18}
                                        className="shrink-0"
                                    />
                                    <span className="grow truncate">{file.file_name}</span>
                                    <span className="shrink-0 text-xs text-gray-500">
                                        {formatBytes(file.size)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <time
                    dateTime={message.creation_date}
                    title={format(date, 'PPPp', { locale })}
                    className="mt-0.5 block text-right text-[11px] text-gray-600"
                >
                    {format(date, 'HH:mm')}
                </time>
            </div>
        </li>
    );
}
