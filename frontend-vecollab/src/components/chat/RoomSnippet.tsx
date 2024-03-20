import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Props {
    room: BackendChatroomSnippet;
    handleChatSelect: (chat: string) => void;
    headerBarMessageEvents: any[];
    memberProfileSnippets: UserSnippet[];
}

export default function RoomSnippet({
    room,
    handleChatSelect,
    headerBarMessageEvents,
    memberProfileSnippets,
}: Props) {
    const { data: session } = useSession();

    const [messageEventCount, setMessageEventCount] = useState<number>(0);
    useEffect(() => {
        setMessageEventCount(headerBarMessageEvents.filter((message) => message.room_id === room._id).length)
    }, [headerBarMessageEvents, session]);

    return (
        <li
            className="rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
            onClick={() => handleChatSelect(room._id)}
        >
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <p className="text-lg font-medium">
                        {room.name
                            ? room.name
                            : memberProfileSnippets.map((member) => member.name).join(', ')}
                    </p>
                    <p className="text-sm text-gray-500">
                        {room.last_message?.message
                            ? `${room.last_message.sender}: ${room.last_message.message}`
                            : 'No messages yet'}
                    </p>
                </div>

                {/* determine if there are any unread messages in this room,
                by using the copy of message events that get deleted once they are acknowledged */}
                {/* {headerBarMessageEvents.filter((message) => message.room_id === room._id).length >
                    0 && <div className="bg-blue-500 w-2 h-2 rounded-full mr-2"></div>} */}
                {messageEventCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-blue-500/75 text-xs font-semibold">
                            {messageEventCount}
                        </span>
                    )}
            </div>
        </li>
    );
}
