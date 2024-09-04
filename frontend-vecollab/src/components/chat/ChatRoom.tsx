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

interface Props {
    socket: Socket;
    socketMessages: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    room: BackendChatroomSnippet;
    closeRoom: () => void,
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

    useEffect(() => {
        // wait till message history is loaded
        if (isLoading) return

        // filter only those socket messages that are in this selected chat room
        const filteredSocketMessages = socketMessages.filter(
            (message) => message.room_id === room._id
        );

        // join message history and filtered socket messages, removing duplicates based on _id
        const allMessages = [...messageHistory, ...filteredSocketMessages];
        const uniqueMessages = allMessages.reduce((acc, message) => {
            return acc.find((m: any) => m._id === message._id)
                ? acc
                : [...acc, message];
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
            <div className="flex flex-nowrap text-nowrap items-center mb-2">
                <button onClick={closeRoom} className="flex rounded-full items-center inline px-1 mr-1 hover:bg-slate-100">
                    <MdArrowBackIosNew />&nbsp;
                </button>
                {room.name ? (
                    <>
                        <span className="font-bold">{room.name}</span>&nbsp;|&nbsp;
                        <div className="flex items-center" title={memberProfileSnippets.map(profile => profile.name).join(', ')
                        }>{room.members.length}&nbsp;<MdOutlineGroup /></div>
                    </>
                ) : (
                    <>
                        {memberProfileSnippets.map((member) => member.name).join(', ')}
                    </>
                )}
            </div>
            <div
                ref={messageContainerRef}
                className="h-full bg-white overflow-y-auto content-scrollbar relative rounded-md border"
            >
                {/* Chat messages */}
                {isLoading ? (
                    <LoadingAnimation size='small' />
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

        </div>
    );
}
