import { fetchPOST, useGetChatrooms } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { MdClose, MdOpenInFull } from 'react-icons/md';
import { Socket } from 'socket.io-client';
import { useTranslation } from 'next-i18next';
import ChatPanel from './ChatPanel';
import { useChatProfileSnippets } from './useChatProfileSnippets';

interface Props {
    socket: Socket;
    messageEvents: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    toggleChatWindow: () => void;
    open: boolean;
    prop_openOrCreateChatWith: string[];
    selectedRoomId: string | null;
    onSelectRoom: (roomId: string | null) => void;
    onRoomDeleted: (roomId: string) => void;
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
    selectedRoomId,
    onSelectRoom,
    onRoomDeleted,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const router = useRouter();

    // the full page chat shows everything the window would
    const onChatPage = router.pathname === '/chat';

    const [openOrCreateChatWith, setOpenOrCreateChatWith] =
        useState<string[]>(prop_openOrCreateChatWith);

    const { data: rooms, isLoading: loadingRooms, mutate } = useGetChatrooms(session!.accessToken);
    const { profileSnippets, isLoading: profileSnippetsLoading } = useChatProfileSnippets(
        rooms,
        loadingRooms,
        open,
        session?.accessToken
    );

    useEffect(() => {
        if (loadingRooms || !prop_openOrCreateChatWith.length) return;

        // find a room with these users
        const existingRoom = rooms.find(
            (room) =>
                room.members.length == prop_openOrCreateChatWith.length &&
                room.members.every((a) => prop_openOrCreateChatWith.includes(a))
        );
        if (existingRoom) {
            onSelectRoom(existingRoom._id);
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
                    // open the new room right away
                    if (res.success) {
                        mutate();
                        onSelectRoom(res.room_id);
                    }
                })
                .finally(() => {
                    setOpenOrCreateChatWith([]);
                });
        }
    }, [
        prop_openOrCreateChatWith,
        loadingRooms,
        rooms,
        session?.accessToken,
        onSelectRoom,
        mutate,
    ]);

    // the header button can't open the window on top of the full page chat
    useEffect(() => {
        if (open && onChatPage) toggleChatWindow();
    }, [open, onChatPage, toggleChatWindow]);

    const maximize = () => {
        toggleChatWindow();
        router.push({
            pathname: '/chat',
            query: {
                ...(selectedRoomId ? { room: selectedRoomId } : {}),
                from: router.asPath, // the page the minimize button returns to
            },
        });
    };

    if (!open || onChatPage) {
        return <></>;
    }

    return (
        <div
            className={`absolute z-40 left-[16px] sm:left-auto right-[16px] sm:right-0 w-auto sm:w-1/4 md:w-1/5 top-24 min-w-[15rem] min-h-[18rem] px-2 py-4 shadow rounded-l bg-white border border-gray-200`}
        >
            <div className="absolute -top-[16px] -left-[16px]">
                <button
                    onClick={(e) => toggleChatWindow()}
                    className="bg-white rounded-full shadow-sm p-2 hover:bg-slate-50 cursor-pointer"
                >
                    <MdClose size={20} />
                </button>
            </div>
            <div className="relative font-bold text-center mb-2">
                {selectedRoomId ? t('chat') : t('chats')}
                <button
                    type="button"
                    onClick={maximize}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 font-normal text-gray-600 hover:bg-slate-100 cursor-pointer"
                    title={t('chat_maximize')}
                    aria-label={t('chat_maximize')}
                >
                    <MdOpenInFull size={16} />
                </button>
            </div>

            <div className="h-[60vh] min-h-[16rem] flex flex-col">
                <ChatPanel
                    socket={socket}
                    messageEvents={messageEvents}
                    headerBarMessageEvents={headerBarMessageEvents}
                    setHeaderBarMessageEvents={setHeaderBarMessageEvents}
                    profileSnippets={profileSnippets}
                    profileSnippetsLoading={profileSnippetsLoading}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={onSelectRoom}
                    onRoomDeleted={onRoomDeleted}
                />
            </div>
        </div>
    );
}
