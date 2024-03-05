import LoadingAnimation from '@/components/LoadingAnimation';
import ChatWindow from '@/components/chat/ChatWindow';
import Sidebar from '@/components/chat/Sidebar';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST, useGetChatrooms } from '@/lib/backend';
import { is } from 'date-fns/locale';
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
    const [profileSnippets, setProfileSnippets] = useState<UserSnippet[]>([]);
    const [profileSnippetsLoading, setProfileSnippetsLoading] = useState<boolean>(true);

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

    useEffect(() => {
        if (isLoading) return;

        // filter a distinct list of usernames from the room snippets
        const usernames = Array.from(new Set(roomSnippets.map((room) => room.members).flat()));
        console.log(usernames);

        // fetch profile snippets
        fetchPOST('/profile_snippets', { usernames: usernames }, session?.accessToken).then(
            (data) => {
                console.log(data);
                setProfileSnippets(
                    data.user_snippets.map((snippet: any) => {
                        return {
                            profilePicUrl: snippet.profile_pic,
                            name: snippet.first_name + ' ' + snippet.last_name,
                            preferredUsername: snippet.username,
                            institution: snippet.institution,
                        };
                    })
                );
                setProfileSnippetsLoading(false);
            }
        );
    }, [isLoading, roomSnippets, session]);

    if (isLoading || profileSnippetsLoading) return <LoadingAnimation />;

    return (
        <>
            <div className="flex">
                <Sidebar
                    handleChatSelect={handleChatSelect}
                    headerBarMessageEvents={headerBarMessageEvents}
                    profileSnippets={profileSnippets}
                />
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
                            memberProfileSnippets={profileSnippets.filter((profileSnippet) =>
                                roomSnippets
                                    .find((room) => room._id === selectedChat)!
                                    .members.includes(profileSnippet.preferredUsername)
                            )}
                        />
                    ) : (
                        <div className="bg-white h-full">Please select a chat</div>
                    )}
                </div>
            </div>
        </>
    );
}
