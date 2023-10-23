import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
    messageEvents: any[];
    setMessageEvents: Dispatch<SetStateAction<any[]>>;
}
Messages.auth = true;
export default function Messages({ socket, messageEvents, setMessageEvents }: Props) {
    const { data: session, status } = useSession();
    const [selectedChat, setSelectedChat] = useState<string>('');
    const [sendingMessage, setSendingMessage] = useState<string>('');

    const handleChatSelect = (chat: string) => {
        setSelectedChat(chat);
    };
    const handleNewChatSelect = (chat: string) => {
        setSelectedChat(chat);
    };

    const handleMessageSend = () => {
        console.log(`Sending message "${sendingMessage}" to ${selectedChat}`);
        socket.emit('message', {
            message: sendingMessage,
            recipients: [
                // for testing purposes, always send messages back and forth between test_admin and test_user depending on who is logged in
                session?.user.preferred_username === 'test_admin' ? 'test_user' : 'test_admin',
            ],
        });
        setSendingMessage('');
    };

    useEffect(() => {
        console.log(messageEvents);
    }, [messageEvents]);

    // TODO possible solution:
    // - subcomponent for every chat, has a message list and the input field, ...
    // - this parent component listens for the message events, distinguishes them (e.g. by participants, some id, ...) and
    //   passes them to the correct subcomponent for display
    // - by doing this, the subcomponent can initially request the message history via api call itself and then only
    //   wait for new messages that have to be displayed

    return (
        <>
            <div className="flex">
                {/* Sidebar */}
                <div className="w-1/5 relative px-4 bg-gray-200 h-[80vh]">
                    <ul className="flex flex-col bg-gray-200 overflow-y-auto">
                        <li
                            className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                            onClick={() => handleChatSelect('Chat 1')}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <p className="text-lg font-medium">Chat 1</p>
                                    <p className="text-sm text-gray-500">
                                        Last message poineg paiowengpagoni poiwengw üp wegüwpegkweg
                                        un9aoas üesfkü
                                    </p>
                                </div>
                            </div>
                        </li>
                        <li
                            className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                            onClick={() => handleChatSelect('Chat 2')}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <p className="text-lg font-medium">Chat 2</p>
                                    <p className="text-sm text-gray-500">Last message</p>
                                </div>
                            </div>
                        </li>
                        <li
                            className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                            onClick={() => handleChatSelect('Chat 3')}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <p className="text-lg font-medium">Chat 3</p>
                                    <p className="text-sm text-gray-500">Last message</p>
                                </div>
                            </div>
                        </li>
                    </ul>
                    <button
                        className="bg-gray-300 rounded-md p-2 cursor-pointer hover:bg-gray-400 absolute bottom-4"
                        onClick={(e) => handleNewChatSelect('neuer Chat')}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-lg font-medium">+</p>
                                <p className="text-sm text-gray-500">New Chat</p>
                            </div>
                        </div>
                    </button>
                </div>
                {/* Main window */}
                <div className="w-4/5 bg-white h-[80vh] overflow-y-auto relative">
                    {selectedChat ? (
                        <div>
                            <h1>{selectedChat}</h1>
                            {/* Chat messages */}
                            <div className="flex flex-col px-36 justify-end">
                                {messageEvents.map((message, index) => (
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
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h1>Select a chat to start messaging</h1>
                        </div>
                    )}
                </div>
            </div>
            {/* Input textarea and send button, only renders when a chat is selected */}
            {selectedChat && (
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
            )}
        </>
    );
}
