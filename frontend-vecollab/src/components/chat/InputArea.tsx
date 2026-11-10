import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { RxCross2, RxFace } from 'react-icons/rx';
import { IoIosSend } from 'react-icons/io';
import { MdAttachFile, MdClose } from 'react-icons/md';
import { useTranslation } from 'next-i18next';
import { useSession } from 'next-auth/react';
import { uploadChatFiles, useGetChatFileLimits } from '@/lib/backend';
import { formatBytes } from '../network/files/fileUtils';
import { useChatFileErrorMessage } from './chatUtils';

interface Props {
    roomID: string;
    socket: Socket;
}

export default function InputArea({ roomID, socket }: Props) {
    const { t } = useTranslation('common');
    const { data: session } = useSession();

    const [sendingMessage, setSendingMessage] = useState<string>('');
    const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

    // files to send with the next message
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: limits } = useGetChatFileLimits(session!.accessToken);
    const errorMessage = useChatFileErrorMessage(limits);

    const addFiles = (newFiles: File[]) => {
        setError(null);
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) addFiles(Array.from(event.target.files));
        event.target.value = '';
    };

    const onDrop = (event: DragEvent) => {
        if (!event.dataTransfer.files?.length) return;
        event.preventDefault();
        addFiles(Array.from(event.dataTransfer.files));
    };

    // the backend checks the limits, this saves pointless uploads though
    const validateFiles = (): string | null => {
        if (!limits) return null;
        if (files.length > limits.max_files_per_message) return 'maximum_files_exceeded';
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > limits.max_message_files_bytes) return 'file_too_large';
        return null;
    };

    const sendFiles = async () => {
        const invalid = validateFiles();
        if (invalid) {
            setError(errorMessage(invalid));
            return;
        }

        setError(null);
        setUploadProgress(0);
        try {
            // the message arrives via the socket like any other message
            const response = await uploadChatFiles(
                roomID,
                files,
                sendingMessage,
                session!.accessToken,
                setUploadProgress
            );
            if (response.success) {
                setFiles([]);
                setSendingMessage('');
            } else {
                setError(errorMessage(response.reason));
            }
        } catch (e) {
            setError(errorMessage());
        } finally {
            setUploadProgress(null);
        }
    };

    const handleMessageSend = () => {
        if (uploadProgress !== null) return;

        if (files.length > 0) {
            sendFiles();
            return;
        }

        if (sendingMessage.trim() === '') return;
        socket.emit('message', {
            message: sendingMessage,
            room_id: roomID,
        });
        setSendingMessage('');
    };

    const sendOnEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.code == 'Enter' && !e.shiftKey) {
            handleMessageSend();
            e.preventDefault();
        }
    };

    return (
        <div className="my-2" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
            {files.length > 0 && (
                <ul className="mb-1 flex flex-wrap gap-1">
                    {files.map((file, index) => (
                        <li
                            key={`${file.name}-${index}`}
                            className="flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2 pr-1 text-xs"
                        >
                            <span className="truncate" title={file.name}>
                                {file.name}
                            </span>
                            <span className="shrink-0 text-gray-500">{formatBytes(file.size)}</span>
                            <button
                                type="button"
                                className="shrink-0 rounded-full p-0.5 hover:bg-gray-200 cursor-pointer"
                                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                                disabled={uploadProgress !== null}
                                title={t('chat_remove_file')}
                                aria-label={t('chat_remove_file')}
                            >
                                <MdClose />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {error && <div className="mb-1 text-sm text-red-700">{error}</div>}
            <div className="border border-[#cccccc] bg-white rounded-md ">
                <textarea
                    className="w-full h-16 p-2 border-b border-b-gray-200 rounded-t-md resize-none"
                    placeholder={t('type_message_placeholder')}
                    value={sendingMessage}
                    onChange={(e) => setSendingMessage(e.target.value)}
                    onKeyDown={(e) => sendOnEnter(e)}
                />
                {showEmojiPicker && (
                    <div className="absolute right-48 bottom-0">
                        <div className="p-4 relative">
                            <Picker
                                data={data}
                                onEmojiSelect={(emoji: any) => {
                                    setSendingMessage(sendingMessage + emoji.native);
                                    setShowEmojiPicker(false);
                                }}
                                perLine={12}
                                previewPosition="none"
                            />
                            <div className="absolute top-0 right-0">
                                <button
                                    className="bg-gray-300 rounded-lg p-1 flex justify-center items-center"
                                    onClick={(e) => setShowEmojiPicker(false)}
                                >
                                    <RxCross2 />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-end">
                    {uploadProgress !== null && (
                        <span className="mr-auto pl-2 text-xs text-gray-500">
                            {t('chat_uploading', { percent: Math.round(uploadProgress * 100) })}
                        </span>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={onFileInputChange}
                    />
                    <button
                        type="button"
                        className="py-2 px-3 rounded-md cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadProgress !== null}
                        title={t('chat_attach_files')}
                        aria-label={t('chat_attach_files')}
                    >
                        <MdAttachFile />
                    </button>
                    <button
                        className="font-bold py-2 px-3 rounded-md cursor-pointer"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        <RxFace />
                    </button>
                    <button
                        type="submit"
                        className="py-2 px-4 rounded-md ml-1 cursor-pointer disabled:opacity-50"
                        onClick={handleMessageSend}
                        disabled={uploadProgress !== null}
                        title={t('chat_send')}
                        aria-label={t('chat_send')}
                    >
                        <IoIosSend />
                    </button>
                </div>
            </div>
        </div>
    );
}
