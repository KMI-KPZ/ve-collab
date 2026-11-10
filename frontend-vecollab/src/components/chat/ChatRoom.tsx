import { downloadAuthenticatedFile, fetchDELETE, useGetChatroomHistory } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../common/LoadingAnimation';
import {
    BackendChatFile,
    BackendChatMessage,
    BackendChatroomSnippet,
} from '@/interfaces/api/apiInterfaces';
import ChatMessage from './ChatMessage';
import InputArea from './InputArea';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import {
    MdArrowBackIosNew,
    MdClose,
    MdDeleteOutline,
    MdOutlineEdit,
    MdOutlineFolder,
    MdOutlineGroup,
    MdSearch,
} from 'react-icons/md';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { useTranslation } from 'next-i18next';
import { GoAlert } from 'react-icons/go';
import Dropdown from '../common/Dropdown';
import ReportDialog from '../common/dialogs/Report';
import ConfirmDialog from '../common/dialogs/Confirm';
import Dialog from '../profile/Dialog';
import Portal from '../common/Portal';
import EditChatRoomForm from './EditChatRoomForm';
import ChatSearch from './ChatSearch';
import ChatFiles from './ChatFiles';
import FilePreviewDialog from '../network/files/FilePreviewDialog';
import { PreviewableFile, isPreviewable } from '../network/files/fileUtils';
import { messageElementId, toPreviewableFile, useChatDayLabel } from './chatUtils';
import { format, parseISO } from 'date-fns';

interface Props {
    socket: Socket;
    socketMessages: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    room: BackendChatroomSnippet;
    closeRoom: () => void;
    roomUpdatedCallback: (room: BackendChatroomSnippet) => void;
    roomDeletedCallback: (roomId: string) => void;
    memberProfileSnippets: UserSnippet[];
    wide?: boolean; // full page: search and files open next to the messages instead of over them
}

type SidePanel = 'none' | 'search' | 'files';

type ListItem =
    | { kind: 'day'; key: string; label: string }
    | { kind: 'message'; message: BackendChatMessage; showSender: boolean };

export default function ChatRoom({
    socket,
    socketMessages,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    room,
    closeRoom,
    roomUpdatedCallback,
    roomDeletedCallback,
    memberProfileSnippets,
    wide = false,
}: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const dayLabel = useChatDayLabel();
    const messageBottomRef = useRef<HTMLLIElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [displayMessages, setDisplayMessages] = useState<BackendChatMessage[]>([]);

    const currentUser = session?.user.preferred_username;

    const {
        data: messageHistory,
        isLoading,
        error,
        mutate,
    } = useGetChatroomHistory(session!.accessToken, room._id);
    // TODO use /chatroom/get_messages_after endpoint with the oldest message id in the socketMessages array from this chatroom
    // TODO pagination: only load x messages at a time, load more when scrolling up instead of loading all messages at once

    const scrollMessagesToBottom = () => {
        if (messageBottomRef.current && messageContainerRef.current) {
            messageContainerRef.current?.scrollTo({
                top: messageBottomRef.current?.offsetTop + messageBottomRef.current?.offsetHeight,
                behavior: 'auto',
            });
        }
    };

    const acknowledgeAllSocketMessages = () => {
        headerBarMessageEvents
            .filter((message) => message.room_id === room._id)
            .filter((message) => message.sender !== session?.user.preferred_username) // dont need to acknowledge own messages
            .forEach((message) => {
                socket.emit('acknowledge_message', {
                    message_id: message._id,
                    room_id: message.room_id,
                });
            });

        setHeaderBarMessageEvents(
            headerBarMessageEvents.filter((message) => message.room_id !== room._id)
        );
    };

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sidePanel, setSidePanel] = useState<SidePanel>('none');
    const [roomError, setRoomError] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);

    const handleSelectOption = (value: string) => {
        switch (value) {
            case 'edit':
                setEditDialogOpen(true);
                break;

            case 'delete':
                setDeleteDialogOpen(true);
                break;

            case 'report':
                setReportDialogOpen(true);
                break;

            default:
                break;
        }
    };

    const ChatRoomDropdown = () => {
        const options = [
            {
                value: 'edit',
                label: t('common:edit_chat_title'),
                icon: <MdOutlineEdit />,
            },
            {
                value: 'delete',
                label: t('common:chat_delete'),
                icon: <MdDeleteOutline />,
                liClasses: 'text-red-700',
            },
            {
                value: 'report',
                label: t('common:report.report_title'),
                icon: <GoAlert />,
                liClasses: 'text-red-500',
            },
        ];

        return <Dropdown options={options} onSelect={handleSelectOption} />;
    };

    const deleteRoom = async () => {
        setDeleteDialogOpen(false);
        const response = await fetchDELETE(
            `/chatroom/delete?room_id=${room._id}`,
            undefined,
            session?.accessToken
        );
        if (response.success) {
            roomDeletedCallback(room._id);
        } else {
            setRoomError(t('common:chat_error_generic'));
        }
    };

    useEffect(() => {
        // wait till message history is loaded
        if (isLoading) return;

        // filter only those socket messages that are in this selected chat room
        const filteredSocketMessages = socketMessages.filter(
            (message) => message.room_id === room._id
        );

        // join message history and filtered socket messages, removing duplicates based on _id
        const allMessages = [...messageHistory, ...filteredSocketMessages];
        const uniqueMessages = allMessages.reduce((acc, message) => {
            return acc.find((m: any) => m._id === message._id) ? acc : [...acc, message];
        }, []);
        setDisplayMessages(uniqueMessages);
    }, [isLoading, messageHistory, socketMessages, room._id]);

    useEffect(() => {
        scrollMessagesToBottom();
        acknowledgeAllSocketMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayMessages]);

    const senderName = (username: string) =>
        memberProfileSnippets.find((member) => member.preferredUsername === username)?.name ||
        username;

    // a separator for each day, and the name of the sender above the first of their
    // consecutive messages, which is only necessary in group chats
    const isGroupChat = room.members.length > 2;
    const listItems = useMemo(() => {
        const items: ListItem[] = [];
        let previous: BackendChatMessage | undefined;
        let previousDay: string | undefined;
        displayMessages.forEach((message) => {
            const date = parseISO(message.creation_date);
            const day = format(date, 'yyyy-MM-dd');
            const newDay = day !== previousDay;
            if (newDay) items.push({ kind: 'day', key: day, label: dayLabel(date) });
            items.push({
                kind: 'message',
                message,
                showSender:
                    isGroupChat &&
                    message.sender !== currentUser &&
                    (newDay || previous?.sender !== message.sender),
            });
            previous = message;
            previousDay = day;
        });
        return items;
    }, [displayMessages, dayLabel, isGroupChat, currentUser]);

    // jumping to a message (from the search or the files): scroll it into view once it
    // is rendered and highlight it for a moment
    const [jumpTarget, setJumpTarget] = useState<string | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

    const jumpToMessage = (messageId: string) => {
        // in the narrow window the panel covers the messages
        if (!wide) setSidePanel('none');
        setJumpTarget(messageId);
    };

    useEffect(() => {
        if (!jumpTarget) return;
        const element = messageContainerRef.current?.querySelector(
            `[id="${messageElementId(jumpTarget)}"]`
        );
        if (!element) return; // not rendered yet, e.g. the history is still loading
        element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setHighlightedMessageId(jumpTarget);
        setJumpTarget(null);
    }, [jumpTarget, listItems]);

    useEffect(() => {
        if (!highlightedMessageId) return;
        const timer = setTimeout(() => setHighlightedMessageId(null), 2500);
        return () => clearTimeout(timer);
    }, [highlightedMessageId]);

    // files are previewed like in the file share of groups, the siblings allow
    // browsing through all previewable files of the room in their order
    const previewableFiles = useMemo(
        () =>
            displayMessages
                .flatMap((message) => message.files)
                .map(toPreviewableFile)
                .filter(isPreviewable),
        [displayMessages]
    );
    const fileCount = useMemo(
        () => displayMessages.reduce((count, message) => count + message.files.length, 0),
        [displayMessages]
    );

    const downloadFile = async (file: PreviewableFile) => {
        const status = await downloadAuthenticatedFile(
            file.file_id!,
            file.name,
            session?.accessToken
        );
        if (status !== 200) setRoomError(t('common:chat_error_generic'));
    };

    const openFile = (file: BackendChatFile) => {
        const node = toPreviewableFile(file);
        if (isPreviewable(node)) setPreviewFile(node);
        else downloadFile(node);
    };

    const renderSidePanel = () => {
        if (sidePanel === 'search') {
            return (
                <ChatSearch
                    roomId={room._id}
                    senderName={senderName}
                    onJump={jumpToMessage}
                    onClose={() => setSidePanel('none')}
                />
            );
        }
        if (sidePanel === 'files') {
            return (
                <ChatFiles
                    roomId={room._id}
                    fileCount={fileCount}
                    senderName={senderName}
                    onOpenFile={openFile}
                    onJump={jumpToMessage}
                    onClose={() => setSidePanel('none')}
                />
            );
        }
        return null;
    };

    const togglePanel = (panel: SidePanel) => setSidePanel(sidePanel === panel ? 'none' : panel);

    const headerButtonClasses = (panel: SidePanel) =>
        `rounded-full p-1.5 hover:bg-slate-100 cursor-pointer ${
            sidePanel === panel ? 'text-ve-collab-blue bg-slate-100' : 'text-gray-600'
        }`;

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex flex-nowrap text-nowrap items-center justify-between mb-2 px-2 gap-2">
                <button
                    onClick={closeRoom}
                    className={`flex rounded-full items-center hover:bg-slate-100 cursor-pointer ${
                        wide ? 'md:hidden' : ''
                    }`}
                >
                    <MdArrowBackIosNew />
                    &nbsp;
                </button>
                {typeof room.name === 'string' && (
                    <span className="font-bold max-w-1/2 m-x-2 truncate" title={room.name}>
                        {room.name}
                    </span>
                )}
                <div className="flex items-center gap-1 ml-auto">
                    <button
                        type="button"
                        onClick={() => togglePanel('search')}
                        className={headerButtonClasses('search')}
                        title={t('common:chat_search')}
                        aria-label={t('common:chat_search')}
                    >
                        <MdSearch size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => togglePanel('files')}
                        className={headerButtonClasses('files')}
                        title={t('common:chat_files')}
                        aria-label={t('common:chat_files')}
                    >
                        <MdOutlineFolder size={18} />
                    </button>
                    <div className="group/members text-sm flex relative hover:cursor-pointer overflow-hidden hover:overflow-visible">
                        {room.members.length}&nbsp;
                        <MdOutlineGroup size={20} />
                        <div className="absolute w-40 xl:w-60 overflow-y-auto truncate max-h-32 right-0 p-2 mt-5 group-hover/members:opacity-100 hover:opacity-100! transition-opacity opacity-0 rounded-md bg-white shadow-sm border border-gray-200 z-10">
                            {memberProfileSnippets.map((member, i) => (
                                <div key={i} className="truncate my-1">
                                    <AuthenticatedImage
                                        imageId={member.profilePicUrl}
                                        alt={t('profile_picture')}
                                        width={20}
                                        height={20}
                                        className="rounded-full mr-3 inline"
                                    />
                                    <span className="truncate">{member.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <ChatRoomDropdown />
                </div>
            </div>
            {roomError && (
                <div className="mx-2 mb-2 flex items-start justify-between gap-2 rounded-md bg-red-50 px-2 py-1 text-sm text-red-700">
                    <span>{roomError}</span>
                    <button
                        type="button"
                        onClick={() => setRoomError(null)}
                        className="cursor-pointer"
                        aria-label={t('common:close')}
                    >
                        <MdClose />
                    </button>
                </div>
            )}
            <div className="flex min-h-0 flex-1 gap-4">
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="relative min-h-0 flex-1">
                        <div
                            ref={messageContainerRef}
                            className="h-full bg-white overflow-y-auto content-scrollbar relative rounded-md border-gray-200"
                        >
                            {/* Chat messages */}
                            {isLoading ? (
                                <LoadingAnimation size="small" />
                            ) : (
                                <ul className="flex flex-col justify-end">
                                    {listItems.map((item) =>
                                        item.kind === 'day' ? (
                                            <li
                                                key={item.key}
                                                role="separator"
                                                className="my-2 flex items-center gap-2 px-2 text-xs text-gray-500"
                                            >
                                                <span className="h-px flex-1 bg-gray-200" />
                                                <span>{item.label}</span>
                                                <span className="h-px flex-1 bg-gray-200" />
                                            </li>
                                        ) : (
                                            <ChatMessage
                                                key={item.message._id}
                                                message={item.message}
                                                own={item.message.sender === currentUser}
                                                senderName={
                                                    item.showSender
                                                        ? senderName(item.message.sender)
                                                        : undefined
                                                }
                                                highlighted={
                                                    item.message._id === highlightedMessageId
                                                }
                                                onOpenFile={openFile}
                                            />
                                        )
                                    )}
                                    <li ref={messageBottomRef} className="h-12"></li>
                                </ul>
                            )}
                        </div>
                        {/* in the narrow window, search and files cover the messages */}
                        {!wide && sidePanel !== 'none' && (
                            <div className="absolute inset-0 z-10 rounded-md bg-white p-1">
                                {renderSidePanel()}
                            </div>
                        )}
                    </div>
                    <InputArea roomID={room._id} socket={socket} />
                </div>
                {wide && sidePanel !== 'none' && (
                    <aside className="w-72 shrink-0 border-l border-gray-200 pl-4 lg:w-80">
                        {renderSidePanel()}
                    </aside>
                )}
            </div>
            <Dialog
                isOpen={editDialogOpen}
                title={t('common:edit_chat_title')}
                onClose={() => setEditDialogOpen(false)}
            >
                <EditChatRoomForm
                    room={room}
                    memberProfileSnippets={memberProfileSnippets}
                    roomUpdatedCallback={roomUpdatedCallback}
                    closeDialogCallback={() => setEditDialogOpen(false)}
                />
            </Dialog>
            {reportDialogOpen && (
                <ReportDialog
                    reportedItemId={room._id}
                    reportedItemType="chatroom"
                    closeCallback={() => {
                        setReportDialogOpen(false);
                    }}
                />
            )}
            {deleteDialogOpen && (
                <ConfirmDialog
                    message={t('common:chat_delete_confirm')}
                    callback={(proceed) => {
                        if (proceed) deleteRoom();
                        else setDeleteDialogOpen(false);
                    }}
                />
            )}
            <Portal>
                <FilePreviewDialog
                    node={previewFile}
                    siblings={previewableFiles}
                    onSelect={setPreviewFile}
                    onDownload={downloadFile}
                    onClose={() => setPreviewFile(null)}
                />
            </Portal>
        </div>
    );
}
