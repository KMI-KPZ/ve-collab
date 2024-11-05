import { useGetChatrooms } from '@/lib/backend';
import { useState } from 'react';
import LoadingAnimation from '../common/LoadingAnimation';
import Dialog from '../profile/Dialog';
import NewChatForm from './NewChatForm';
import { useSession } from 'next-auth/react';
import RoomSnippet from './RoomSnippet';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { MdOutlineAddCircleOutline } from 'react-icons/md';

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

    return (
        <div className="relative px-4 max-h-[80vh]">
            {isLoading ? (
                <LoadingAnimation size='small' />
            ) : (
                <ul className="flex flex-col  overflow-y-auto">
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
            <button
                className="mt-4 p-2 rounded-full cursor-pointer hover:bg-slate-100"
                onClick={(e) => handleOpenNewChatDialog()}
                title="Neuen Chat erstellen"
            >
                <MdOutlineAddCircleOutline />
            </button>
            <Dialog
                isOpen={isNewChatDialogOpen}
                title={`Neuer Chat`}
                onClose={handleCloseNewChatDialog}
            >
                <NewChatForm closeDialogCallback={handleCloseNewChatDialog} />
            </Dialog>
        </div>
    );
}
