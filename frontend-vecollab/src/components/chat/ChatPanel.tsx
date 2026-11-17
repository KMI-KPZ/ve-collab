import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useGetChatrooms } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { Dispatch, SetStateAction } from 'react';
import { Socket } from 'socket.io-client';
import LoadingAnimation from '../common/LoadingAnimation';
import ChatRoom from './ChatRoom';
import Rooms from './Rooms';

interface Props {
    socket: Socket;
    messageEvents: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    profileSnippets: UserSnippet[];
    profileSnippetsLoading: boolean;
    selectedRoomId: string | null;
    onSelectRoom: (roomId: string | null) => void;
    onRoomDeleted: (roomId: string) => void;
    wide?: boolean; // full page: the room list and the selected room side by side
}

export default function ChatPanel({
    socket,
    messageEvents,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    profileSnippets,
    profileSnippetsLoading,
    selectedRoomId,
    onSelectRoom,
    onRoomDeleted,
    wide = false,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const { data: rooms, mutate } = useGetChatrooms(session!.accessToken);
    const selectedRoom = rooms.find((room) => room._id === selectedRoomId);

    // a room was renamed or got new members: apply the change to the list right away
    // and refetch it, so that the snippets are up to date as well
    const handleRoomUpdate = (updatedRoom: BackendChatroomSnippet) => {
        mutate(
            (data: any) =>
                data && {
                    ...data,
                    rooms: data.rooms.map((room: BackendChatroomSnippet) =>
                        room._id === updatedRoom._id ? updatedRoom : room
                    ),
                },
            { revalidate: true }
        );
    };

    const room = selectedRoom && (
        <ChatRoom
            key={selectedRoom._id}
            socketMessages={messageEvents}
            headerBarMessageEvents={headerBarMessageEvents}
            setHeaderBarMessageEvents={setHeaderBarMessageEvents}
            socket={socket}
            room={selectedRoom}
            closeRoom={() => onSelectRoom(null)}
            roomUpdatedCallback={handleRoomUpdate}
            roomDeletedCallback={onRoomDeleted}
            memberProfileSnippets={profileSnippets.filter((profile) =>
                selectedRoom.members.includes(profile.preferredUsername)
            )}
            wide={wide}
        />
    );

    const roomList = profileSnippetsLoading ? (
        <LoadingAnimation size="small" />
    ) : (
        <Rooms
            handleChatSelect={onSelectRoom}
            socketMessages={messageEvents}
            headerBarMessageEvents={headerBarMessageEvents}
            profileSnippets={profileSnippets}
            selectedRoomId={selectedRoomId}
        />
    );

    if (!wide) {
        return <div className="h-full flex flex-col">{room || roomList}</div>;
    }

    // on small screens the page shows one of both as well
    return (
        <div className="flex h-full gap-4">
            <div
                className={`h-full w-full shrink-0 md:w-80 md:border-r md:border-gray-200 md:pr-4 ${
                    room ? 'hidden md:block' : ''
                }`}
            >
                {roomList}
            </div>
            <div className={`h-full min-w-0 flex-1 ${room ? '' : 'hidden md:block'}`}>
                {room || (
                    <div className="flex h-full items-center justify-center text-gray-500">
                        {t('chat_select_room')}
                    </div>
                )}
            </div>
        </div>
    );
}
