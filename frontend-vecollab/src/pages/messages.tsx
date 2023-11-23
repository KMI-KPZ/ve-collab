import ChatWindow from '@/components/chat/ChatWindow';
import Sidebar from '@/components/chat/Sidebar';
import { useGetChatrooms } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
    messageEvents: any[];
    setMessageEvents: Dispatch<SetStateAction<any[]>>;
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
}

Messages.auth = true;
export default function Messages({
    socket,
    messageEvents,
    setMessageEvents,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
}: Props) {
    const { data: session, status } = useSession();
    const [selectedChat, setSelectedChat] = useState<string>('');

    const { data: roomSnippets, isLoading, error, mutate } = useGetChatrooms(session!.accessToken);
    console.log(roomSnippets);
    
    const handleChatSelect = (chat: string) => {
        setSelectedChat(chat);
    };

    useEffect(() => {
        console.log('messageEvents:');
        console.log(messageEvents);
        console.log('headerBarMessageEvents:');
        console.log(headerBarMessageEvents);
    }, [messageEvents, headerBarMessageEvents]);

    return (
        <>
            <div className="flex">
                <Sidebar handleChatSelect={handleChatSelect} headerBarMessageEvents={headerBarMessageEvents} />
                <div className="w-4/5 h-[80vh]">
                    {selectedChat ? (
                        <ChatWindow
                            selectedChatID={selectedChat}
                            socketMessages={messageEvents}
                            setSocketMessages={setMessageEvents}
                            headerBarMessageEvents={headerBarMessageEvents}
                            setHeaderBarMessageEvents={setHeaderBarMessageEvents}
                            socket={socket}
                            roomInfo={roomSnippets.find((room) => room._id === selectedChat)!}
                        />
                    ) : (
                        <div className="bg-white h-full">Please select a chat</div>
                    )}
                </div>
            </div>
        </>
    );
}
