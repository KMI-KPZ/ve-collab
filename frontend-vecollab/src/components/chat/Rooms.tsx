import { useGetChatrooms } from '@/lib/backend';
import { useState } from 'react';
import LoadingAnimation from '../common/LoadingAnimation';
import Dialog from '../profile/Dialog';
import NewChatForm from './NewChatForm';
import { useSession } from 'next-auth/react';
import RoomSnippet from './RoomSnippet';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'next-i18next';
import ButtonLight from '../common/buttons/ButtongLight';

interface Props {
    handleChatSelect: (chat: string) => void;
    headerBarMessageEvents: any[];
    profileSnippets: UserSnippet[];
}

export default function Sidebar({
    handleChatSelect,
    headerBarMessageEvents,
    profileSnippets,
}: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);

    const { data: roomSnippets, isLoading, error, mutate } = useGetChatrooms(session!.accessToken);
    /* TODO sort: rooms with unread messages first (sorted by last message timestamp), then by last message timestamp */

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
                {roomSnippets.length == 0 ? (
                    <div>{t('no_rooms_yet')}</div>
                ) : (
                    <ul className="flex flex-col border-b border-b-gray-200 pb-2">
                        {roomSnippets.map((room) => (
                            <RoomSnippet
                                key={room._id}
                                room={room}
                                handleChatSelect={handleChatSelect}
                                headerBarMessageEvents={headerBarMessageEvents}
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
