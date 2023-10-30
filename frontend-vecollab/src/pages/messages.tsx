import LoadingAnimation from '@/components/LoadingAnimation';
import ChatWindow from '@/components/chat/ChatWindow';
import NewChatForm from '@/components/chat/NewChatForm';
import Dialog from '@/components/profile/Dialog';
import { useGetChatrooms } from '@/lib/backend';
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
    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);

    const { data: roomSnippets, isLoading, error, mutate } = useGetChatrooms(session!.accessToken);
    console.log(roomSnippets);
    const handleOpenNewChatDialog = () => {
        setIsNewChatDialogOpen(true);
    };
    const handleCloseNewChatDialog = () => {
        // TODO reload chats maybe?
        setIsNewChatDialogOpen(false);
        mutate();
    };

    const handleChatSelect = (chat: string) => {
        console.log(chat);
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
                        {isLoading ? (
                            <li>
                                <LoadingAnimation />
                            </li>
                        ) : (
                            roomSnippets.map((room) => ( // TODO sort: rooms with unread messages first (sorted by last message timestamp), then by last message timestamp
                                <li
                                    key={room._id}
                                    className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
                                    onClick={() => handleChatSelect(room._id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <p className="text-lg font-medium">
                                                {room.name ? room.name : room.members.join(', ')}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {room.last_message
                                                    ? room.last_message
                                                    : 'No messages yet'}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                    <button
                        className="bg-gray-300 rounded-md p-2 cursor-pointer hover:bg-gray-400 absolute bottom-4"
                        onClick={(e) => handleOpenNewChatDialog()}
                    >
                        {/* TODO render small form with user select, name, etc */}
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-lg font-medium">+</p>
                                <p className="text-sm text-gray-500">New Chat</p>
                            </div>
                        </div>
                    </button>
                    <Dialog
                        isOpen={isNewChatDialogOpen}
                        title={`neuen Chat erstellen`}
                        onClose={handleCloseNewChatDialog}
                    >
                        <NewChatForm closeDialogCallback={handleCloseNewChatDialog} />
                    </Dialog>
                </div>
                <div className="w-4/5 h-[80vh]">
                    {selectedChat ? (
                        <ChatWindow
                            selectedChat={selectedChat}
                            messages={messageEvents}
                            socket={socket}
                        />
                    ) : (
                        <div className="bg-white h-full">Please select a chat</div>
                    )}
                </div>
            </div>
        </>
    );
}
