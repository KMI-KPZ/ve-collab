import { useGetChatrooms } from '@/lib/backend';
import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingAnimation from '../common/LoadingAnimation';
import Dialog from '../profile/Dialog';
import NewChatForm from './NewChatForm';
import { useSession } from 'next-auth/react';
import RoomSnippet from './RoomSnippet';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'next-i18next';
import ButtonLight from '../common/buttons/ButtongLight';
import { BackendChatMessage } from '@/interfaces/api/apiInterfaces';

interface Props {
    handleChatSelect: (chat: string) => void;
    socketMessages: any[];
    headerBarMessageEvents: any[];
    profileSnippets: UserSnippet[];
}

// timestamp of a message in ms, used to order the rooms by their latest activity
const messageTimestamp = (message: BackendChatMessage): number => {
    const timestamp = new Date(message.creation_date).getTime();
    return isNaN(timestamp) ? 0 : timestamp;
};

// rooms without any message fall back to their creation date, which is encoded
// in the first 4 bytes of the mongodb ObjectId (as seconds since epoch)
const roomCreationTimestamp = (roomId: string): number => {
    const seconds = parseInt(roomId.slice(0, 8), 16);
    return isNaN(seconds) ? 0 : seconds * 1000;
};

export default function Sidebar({
    handleChatSelect,
    socketMessages,
    headerBarMessageEvents,
    profileSnippets,
}: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);

    const { data: roomSnippets, isLoading, error, mutate } = useGetChatrooms(session!.accessToken);

    // rooms that somebody else has created with us while the list was already fetched are
    // unknown here, so their messages would silently be dropped. remember which of those
    // we have already reacted to, otherwise a room that the refetch doesn't yield (e.g. because
    // we got removed from it in the meantime) would trigger a refetch on every render
    const refetchedForRooms = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (isLoading) return;

        const unknownRoomIds = socketMessages
            .map((message) => message.room_id)
            .filter(
                (roomId) =>
                    !roomSnippets.some((room) => room._id === roomId) &&
                    !refetchedForRooms.current.has(roomId)
            );
        if (!unknownRoomIds.length) return;

        unknownRoomIds.forEach((roomId) => refetchedForRooms.current.add(roomId));
        mutate(); // reload chatrooms to pick up the room this message belongs to
    }, [socketMessages, roomSnippets, isLoading, mutate]);

    // rooms with unread messages come first (newest first), followed by all
    // remaining rooms, also newest first.
    // the room snippets from the api only know about the messages that already existed
    // when the list was fetched, so messages that arrived via socket in the meantime are
    // merged in to keep both the order and the message preview up to date
    const orderedRooms = useMemo(() => {
        return roomSnippets
            .map((room) => {
                const lastMessage = socketMessages
                    .filter((message) => message.room_id === room._id)
                    .reduce<BackendChatMessage | undefined>(
                        (latest, message) =>
                            !latest || messageTimestamp(message) > messageTimestamp(latest)
                                ? message
                                : latest,
                        room.last_message || undefined
                    );

                // unread messages are those that have not been acknowledged yet, i.e. those
                // still in the header bar copy of the message events (own messages excluded)
                const unreadCount = headerBarMessageEvents.filter(
                    (message) =>
                        message.room_id === room._id &&
                        message.sender !== session?.user.preferred_username
                ).length;

                return {
                    room: { ...room, last_message: lastMessage },
                    unreadCount,
                    lastActivity: lastMessage
                        ? messageTimestamp(lastMessage)
                        : roomCreationTimestamp(room._id),
                };
            })
            .sort(
                (a, b) =>
                    Number(b.unreadCount > 0) - Number(a.unreadCount > 0) ||
                    b.lastActivity - a.lastActivity
            );
    }, [roomSnippets, socketMessages, headerBarMessageEvents, session]);

    const handleOpenNewChatDialog = () => {
        setIsNewChatDialogOpen(true);
    };
    const handleCloseNewChatDialog = () => {
        setIsNewChatDialogOpen(false);
        mutate(); // reload chatrooms
    };

    if (isLoading) return <LoadingAnimation size="small" />;

    return (
        <div className="relative flex flex-col h-full">
            {/* fixed, non-scrolling header so the "new chat" button stays reachable
            regardless of how many rooms are in the list below */}
            <div className="flex justify-end shrink-0 mb-2">
                <ButtonLight
                    className="rounded-full!"
                    onClick={() => handleOpenNewChatDialog()}
                    title={t('create_new_chat_title')}
                >
                    <MdAdd size={22} />
                </ButtonLight>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {orderedRooms.length == 0 ? (
                    <div>{t('no_rooms_yet')}</div>
                ) : (
                    <ul className="flex flex-col border-b border-b-gray-200 pb-2">
                        {orderedRooms.map(({ room, unreadCount }) => (
                            <RoomSnippet
                                key={room._id}
                                room={room}
                                handleChatSelect={handleChatSelect}
                                unreadCount={unreadCount}
                                memberProfileSnippets={profileSnippets.filter((profileSnippet) =>
                                    room.members.includes(profileSnippet.preferredUsername)
                                )}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <Dialog
                isOpen={isNewChatDialogOpen}
                title={t('new_chat_title')}
                onClose={handleCloseNewChatDialog}
            >
                <NewChatForm closeDialogCallback={handleCloseNewChatDialog} />
            </Dialog>
        </div>
    );
}
