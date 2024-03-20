import { useGetChatrooms } from '@/lib/backend';
import { useState } from 'react';
import LoadingAnimation from '../LoadingAnimation';
import Dialog from '../profile/Dialog';
import NewChatForm from './NewChatForm';
import { useSession } from 'next-auth/react';
import RoomSnippet from './RoomSnippet';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';

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
            <ul className="flex flex-col  overflow-y-auto">
                {isLoading ? (
                    <li>
                        <LoadingAnimation />
                    </li>
                ) : (
                    roomSnippets.map((room) => (
                        <RoomSnippet
                            key={room._id}
                            room={room}
                            handleChatSelect={handleChatSelect}
                            headerBarMessageEvents={headerBarMessageEvents}
                            memberProfileSnippets={profileSnippets.filter((profileSnippet) =>
                                room.members.includes(profileSnippet.preferredUsername)
                            )}
                        />
                    ))
                )}
            </ul>
            <button
                className="rounded-md p-2 cursor-pointer hover:bg-gray-400 relative bottom-4 mt-4"
                onClick={(e) => handleOpenNewChatDialog()}
            >
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
    );
}
