import { fetchGET, useGetChatroomHistory } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../LoadingAnimation';

interface Props {
    socket: Socket;
    selectedChatID: string;
    socketMessages: any[];
}

export default function ChatWindow({ socket, selectedChatID, socketMessages }: Props) {
    const { data: session, status } = useSession();

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

    useEffect(() => {
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
    }, [messageHistory, socketMessages]);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Main window */}
            <div className="h-full bg-white overflow-y-auto relative">
                <div>
                    <h1>{selectedChatID}</h1>
                    {/* Chat messages */}
                    <div className="flex flex-col px-36 justify-end">
                        {isLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <>
                                {displayMessages.map((message, index) => (
                                    <div key={index}>
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
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
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
