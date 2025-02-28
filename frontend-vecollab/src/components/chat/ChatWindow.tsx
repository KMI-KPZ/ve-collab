import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST, useGetChatrooms } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../common/LoadingAnimation';
import ChatRoom from './ChatRoom';
import Rooms from '@/components/chat/Rooms';
import { useTranslation } from 'next-i18next';

interface Props {
    socket: Socket;
    messageEvents: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    toggleChatWindow: () => void;
    open: boolean;
    prop_openOrCreateChatWith: string[];
}

ChatWindow.auth = true;
export default function ChatWindow({
    socket,
    messageEvents,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    toggleChatWindow,
    open,
    prop_openOrCreateChatWith,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const [selectedRoom, setSelectedRoom] = useState<BackendChatroomSnippet>();
    const [profileSnippets, setProfileSnippets] = useState<UserSnippet[]>([]);
    const [profileSnippetsLoading, setProfileSnippetsLoading] = useState<boolean>(true);

    const [openOrCreateChatWith, setOpenOrCreateChatWith] =
        useState<string[]>(prop_openOrCreateChatWith);

    const {
        data: rooms,
        isLoading: loadingRooms,
        error,
        mutate,
    } = useGetChatrooms(session!.accessToken);

    useEffect(() => {
        if (loadingRooms || !open) return;

        // edge case: having no rooms would cause loading animation to spin indefinitely
        // because of initial true state
        if (rooms.length === 0) {
            setProfileSnippetsLoading(false);
            return;
        }

        // filter a distinct list of usernames from the room snippets
        const usernames = Array.from(new Set(rooms.map((room) => room.members).flat()));

        if (profileSnippets.length) return;
        // fetch profile snippets
        fetchPOST('/profile_snippets', { usernames: usernames }, session?.accessToken).then(
            (data) => {
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
    }, [loadingRooms, open, profileSnippets, rooms, session]);

    useEffect(() => {
        if (loadingRooms || !prop_openOrCreateChatWith.length) return;

        // find a room with these users
        const existingRoom = rooms.find(
            (room) =>
                room.members.length == prop_openOrCreateChatWith.length &&
                room.members.every((a) => prop_openOrCreateChatWith.includes(a))
        );
        if (existingRoom) {
            setSelectedRoom(existingRoom);
            setOpenOrCreateChatWith([]);
        } else {
            fetchPOST(
                '/chatroom/create_or_get',
                {
                    members: prop_openOrCreateChatWith, // current user will be added by backend
                    name: null,
                },
                session?.accessToken
            )
                .then((res) => {
                    console.log('/chatroom/create_or_get', { res });
                })
                .finally(() => {
                    setOpenOrCreateChatWith([]);
                });
        }
    }, [prop_openOrCreateChatWith, loadingRooms, rooms, session?.accessToken]);

    const handleChatSelect = (chat: string) => {
        setSelectedRoom(rooms.find((room) => room._id === chat));
    };

    if (!open) {
        return <></>;
    }

    return (
        <div
            className={`absolute z-50 right-0 top-24 w-1/5 min-w-[15rem] min-h-[18rem] px-2 py-4 shadow-sm rounded-l bg-white border border-gray-200`}
        >
            <div className="absolute -top-[16px] -left-[16px]">
                <button
                    onClick={(e) => toggleChatWindow()}
                    className="bg-white rounded-full shadow-sm p-2 hover:bg-slate-50"
                >
                    <MdClose size={20} />
                </button>
            </div>
            <div className="font-bold text-center mb-2">
                {selectedRoom ? t('chat') : t('chats')}
            </div>

            {selectedRoom ? (
                <div className="h-[60vh] min-h-[16rem] flex flex-col">
                    <ChatRoom
                        socketMessages={messageEvents}
                        headerBarMessageEvents={headerBarMessageEvents}
                        setHeaderBarMessageEvents={setHeaderBarMessageEvents}
                        socket={socket}
                        room={selectedRoom!}
                        closeRoom={() => setSelectedRoom(undefined)}
                        memberProfileSnippets={profileSnippets.filter((profile) =>
                            selectedRoom.members.includes(profile.preferredUsername)
                        )}
                    />
                </div>
            ) : (
                <div className="h-[60vh] min-h-[16rem]">
                    {profileSnippetsLoading ? (
                        <LoadingAnimation size="small" />
                    ) : (
                        <Rooms
                            handleChatSelect={handleChatSelect}
                            headerBarMessageEvents={headerBarMessageEvents}
                            profileSnippets={profileSnippets}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
