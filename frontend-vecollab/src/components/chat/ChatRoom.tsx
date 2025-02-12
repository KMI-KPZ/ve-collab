import { useGetChatroomHistory } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../common/LoadingAnimation';
import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import ChatMessage from './ChatMessage';
import InputArea from './InputArea';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { MdArrowBackIosNew, MdOutlineGroup } from 'react-icons/md';
import AuthenticatedImage from '../common/AuthenticatedImage';
import { useTranslation } from 'next-i18next';
import { GoAlert } from 'react-icons/go';
import Dropdown from '../common/Dropdown';
import ReportDialog from '../common/dialogs/Report';

interface Props {
    socket: Socket;
    socketMessages: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    room: BackendChatroomSnippet;
    closeRoom: () => void;
    memberProfileSnippets: UserSnippet[];
}

export default function ChatRoom({
    socket,
    socketMessages,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    room,
    closeRoom,
    memberProfileSnippets,
}: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const messageBottomRef = useRef<HTMLLIElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [displayMessages, setDisplayMessages] = useState<any[]>([]);

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

    const handleSelectOption = (value: string) => {
        switch (value) {
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
                value: 'report',
                label: t('common:report.report_title'),
                icon: <GoAlert />,
                liClasses: 'text-red-500',
            },
        ];

        return <Dropdown options={options} onSelect={handleSelectOption} />;
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

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex flex-nowrap text-nowrap items-center justify-between mb-2 px-2">
                <button
                    onClick={closeRoom}
                    className="flex rounded-full items-center hover:bg-slate-100"
                >
                    <MdArrowBackIosNew />
                    &nbsp;
                </button>
                {typeof room.name === 'string' && (
                    <span className="font-bold max-w-1/2 m-x-2 truncate" title={room.name}>
                        {room.name}
                    </span>
                )}
                <div className="flex items-center">
                    <div className="group/members text-sm flex relative hover:cursor-pointer overflow-hidden hover:overflow-visible">
                        {room.members.length}&nbsp;
                        <MdOutlineGroup size={20} />
                        <div className="absolute w-40 xl:w-60 overflow-y-auto truncate max-h-32 right-0 p-2 mt-5 group-hover/members:opacity-100 hover:!opacity-100 transition-opacity opacity-0 rounded-md bg-white shadow border z-10">
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
            <div
                ref={messageContainerRef}
                className="h-full bg-white overflow-y-auto content-scrollbar relative rounded-md border"
            >
                {/* Chat messages */}
                {isLoading ? (
                    <LoadingAnimation size="small" />
                ) : (
                    <ul className="flex flex-col justify-end">
                        {displayMessages.map((message, index) => (
                            <ChatMessage
                                key={index}
                                message={message}
                                currentUser={session?.user.preferred_username}
                            />
                        ))}
                        <li ref={messageBottomRef} className="h-12"></li>
                    </ul>
                )}
            </div>
            <InputArea roomID={room._id} socket={socket} />
            {reportDialogOpen && (
                <ReportDialog
                    reportedItemId={room._id}
                    reportedItemType="chatroom"
                    closeCallback={() => {
                        setReportDialogOpen(false);
                    }}
                />
            )}
        </div>
    );
}
