import { useGetChatrooms } from '@/lib/backend';
import { useState } from 'react';
import LoadingAnimation from '../LoadingAnimation';
import Dialog from '../profile/Dialog';
import NewChatForm from './NewChatForm';
import { useSession } from 'next-auth/react';
import RoomSnippet from './RoomSnippet';

interface Props {
    handleChatSelect: (chat: string) => void;
    headerBarMessageEvents: any[];
}

export default function Sidebar({ handleChatSelect, headerBarMessageEvents }: Props) {
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
        <div className="w-1/5 relative px-4 bg-gray-200 h-[80vh]">
            <ul className="flex flex-col bg-gray-200 overflow-y-auto">
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
                        />
                    ))
                )}
            </ul>
            <button
                className="bg-gray-300 rounded-md p-2 cursor-pointer hover:bg-gray-400 absolute bottom-4"
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
