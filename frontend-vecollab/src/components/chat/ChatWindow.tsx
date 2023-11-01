import { fetchGET, useGetChatroomHistory } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../LoadingAnimation';

interface Props {
    socket: Socket;
    selectedChatID: string;
    socketMessages: any[];
    setSocketMessages: Dispatch<SetStateAction<any>>;
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    roomInfo?: any;
}

export default function ChatWindow({
    socket,
    selectedChatID,
    socketMessages,
    setSocketMessages,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    roomInfo,
}: Props) {
    const { data: session, status } = useSession();
    const messageBottomRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [sendingMessage, setSendingMessage] = useState<string>('');
    const [displayMessages, setDisplayMessages] = useState<any[]>([]);

    const {
        data: messageHistory,
        isLoading,
        error,
        mutate,
    } = useGetChatroomHistory(session!.accessToken, selectedChatID);
    // TODO use /chatroom/get_messages_after endpoint with the oldest message id in the socketMessages array from this chatroom
    // TODO pagination: only load x messages at a time, load more when scrolling up instead of loading all messages at once

    // TODO auto scroll message container to bottom on new message

    const handleMessageSend = () => {
        console.log(`Sending message "${sendingMessage}" to ${selectedChatID}`);
        socket.emit('message', {
            message: sendingMessage,
            room_id: selectedChatID,
        });
        setSendingMessage('');
    };

    const scrollMessagesToBottom = () => {
        if (messageBottomRef.current && messageContainerRef.current) {
            messageContainerRef.current?.scrollTo({
                top: messageBottomRef.current?.offsetTop + messageBottomRef.current?.offsetHeight,
                behavior: 'smooth',
            });
            console.log('am scrolling');
        }
    };

    const acknowledgeAllSocketMessages = () => {
        socketMessages
            .filter((message) => message.room_id === selectedChatID)
            .forEach((message) => {
                socket.emit('acknowledge_message', {
                    message_id: message._id,
                    room_id: message.room_id,
                });
            });

        setHeaderBarMessageEvents(headerBarMessageEvents.filter((message) => message.room_id !== selectedChatID));
    };

    useEffect(() => {
        if (!isLoading) {
            // wait till message history is loaded
            console.log(messageHistory);
            console.log(socketMessages);

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
    }, [messageHistory, socketMessages, selectedChatID]);

    useEffect(() => {
        scrollMessagesToBottom();
        acknowledgeAllSocketMessages();
    }, [displayMessages]);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Main window */}
            {roomInfo.name ? (
                <div className="flex flex-col justify-center items-center h-16 bg-gray-200">
                    <p className="text-lg font-medium">{roomInfo.name}</p>
                    <p className="text-lg font-medium text-gray-500">
                        {roomInfo.members?.join(', ')}
                    </p>
                </div>
            ) : (
                <div className="flex justify-center items-center h-16 bg-gray-200">
                    <p className="text-lg font-medium">{roomInfo.members?.join(', ')}</p>
                </div>
            )}
            <div
                ref={messageContainerRef}
                className="h-full bg-white overflow-y-auto content-scrollbar relative"
            >
                {/* Chat messages */}
                <ul className="flex flex-col px-36 justify-end">
                    {isLoading ? (
                        <LoadingAnimation />
                    ) : (
                        <>
                            {displayMessages.map((message, index) => (
                                <li key={index}>
                                    {message.sender === session?.user.preferred_username ? (
                                        <div className="flex justify-end">
                                            <div className="bg-ve-collab-blue/50 rounded-md p-2 m-1 max-w-4xl break-words">
                                                <p>{message.message}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-start">
                                            <div className="bg-gray-200 rounded-md p-2 m-1 max-w-4xl break-words">
                                                <p>{message.message}</p>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                            <div ref={messageBottomRef} className="h-12" />
                        </>
                    )}
                </ul>
            </div>
            {/* Input textarea and send button */}
            <div className="flex">
                <div className="w-1/5 bg-gray-200"></div>
                <div className="w-4/5 flex items-center p-4 justify-center">
                    <textarea
                        className="w-4/5 h-16 p-2 rounded-md resize-none"
                        placeholder="Type your message here..."
                        value={sendingMessage}
                        onChange={(e) => setSendingMessage(e.target.value)}
                    />
                    <button
                        className="bg-ve-collab-orange hover:bg-ve-collab-orange/70 text-white font-bold py-2 px-4 rounded-md ml-2"
                        onClick={handleMessageSend}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
