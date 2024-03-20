import { useGetChatroomHistory } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../LoadingAnimation';
import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import RoomHeader from './RoomHeader';
import ChatMessage from './ChatMessage';
import InputArea from './InputArea';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';

interface Props {
    socket: Socket;
    selectedChatID: string;
    socketMessages: any[];
    setSocketMessages: Dispatch<SetStateAction<any>>;
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    roomInfo: BackendChatroomSnippet;
    memberProfileSnippets: UserSnippet[];
}

export default function ChatWindow({
    socket,
    selectedChatID,
    socketMessages,
    setSocketMessages,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    roomInfo,
    memberProfileSnippets,
}: Props) {
    const { data: session, status } = useSession();
    const messageBottomRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [displayMessages, setDisplayMessages] = useState<any[]>([]);

    const {
        data: messageHistory,
        isLoading,
        error,
        mutate,
    } = useGetChatroomHistory(session!.accessToken, selectedChatID);
    // TODO use /chatroom/get_messages_after endpoint with the oldest message id in the socketMessages array from this chatroom
    // TODO pagination: only load x messages at a time, load more when scrolling up instead of loading all messages at once

    const scrollMessagesToBottom = () => {
        if (messageBottomRef.current && messageContainerRef.current) {
            messageContainerRef.current?.scrollTo({
                top: messageBottomRef.current?.offsetTop + messageBottomRef.current?.offsetHeight,
                behavior: 'smooth',
            });
        }
    };

    const acknowledgeAllSocketMessages = () => {
        headerBarMessageEvents
            .filter((message) => message.room_id === selectedChatID)
            .filter((message) => message.sender !== session?.user.preferred_username) // dont need to acknowledge own messages
            .forEach((message) => {
                socket.emit('acknowledge_message', {
                    message_id: message._id,
                    room_id: message.room_id,
                });
            });

        setHeaderBarMessageEvents(
            headerBarMessageEvents.filter((message) => message.room_id !== selectedChatID)
        );
    };

    useEffect(() => {
        // wait till message history is loaded
        if (!isLoading) {
            // filter only those socket messages that are in this selected chat room
            const filteredSocketMessages = socketMessages.filter(
                (message) => message.room_id === selectedChatID
            );

            // join message history and filtered socket messages, removing duplicates based on _id
            const allMessages = [...messageHistory, ...filteredSocketMessages];
            const uniqueMessages = allMessages.reduce((acc, message) => {
                const existingMessage = acc.find((m: any) => m._id === message._id);
                if (existingMessage) {
                    return acc;
                } else {
                    return [...acc, message];
                }
            }, []);

            setDisplayMessages(uniqueMessages);
        }
    }, [isLoading, messageHistory, socketMessages, selectedChatID]);

    useEffect(() => {
        scrollMessagesToBottom();
        acknowledgeAllSocketMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayMessages]);

    return (
        <div className="w-full h-full flex flex-col">
            {/* <RoomHeader roomInfo={roomInfo} memberProfileSnippets={memberProfileSnippets} /> */}
            <div
                ref={messageContainerRef}
                className="h-full bg-white overflow-y-auto content-scrollbar relative rounded-md border"
            >
                {/* Chat messages */}
                <ul className="flex flex-col justify-end">
                    {isLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <>
                            {displayMessages.map((message, index) => (
                                <ChatMessage
                                    key={index}
                                    message={message}
                                    currentUser={session?.user.preferred_username}
                                />
                            ))}
                            <div ref={messageBottomRef} className="h-12" />
                        </>
                    )}
                </ul>
            </div>
            <InputArea roomID={selectedChatID} socket={socket} />
        </div>
    );
}
