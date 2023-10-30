import ChatWindow from '@/components/chat/ChatWindow';
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

    const handleChatSelect = (chat: string) => {
        setSelectedChat(chat);
    };
    const handleNewChatSelect = (chat: string) => {
        /* TODO:
            create new room by using api with participants, name, etc from form (also TODO)
            and get back room id
        */
        setSelectedChat(chat);
    };

    useEffect(() => {
        // TODO request all rooms of user from api with their corresponding room ids and render
        // them in sidebar
        console.log(messageEvents);
    }, [messageEvents]);

    // TODO possible solution:
    // - subcomponent for every chat, has a message list and the input field, ...
    // - this parent component here has a big dictionary that maps rooms (id) to a list of messages, listens for the message events, distinguishes them (by room id) and
    //   adds the message to the corresponding room
    // - by doing this, the subcomponent can initially request the message history via api call itself and then only
    //   wait for new messages that have to be displayed
    // - subcompoents also remove messages from events list themselves once they determine the message was "read" (e.g. in viewport or scroll to bottom)

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
                        {/* TODO render small form with user select, name, etc */}
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-lg font-medium">+</p>
                                <p className="text-sm text-gray-500">New Chat</p>
                            </div>
                        </div>
                    </button>
                </div>
                <div className="w-4/5 h-[80vh]">
                    {selectedChat ? (
                        <ChatWindow selectedChat={selectedChat} messages={messageEvents} socket={socket} />
                    ) : (
                        <div className='bg-white h-full'>Please select a chat</div>
                    )}
                </div>
            </div>
        </>
    );
}
