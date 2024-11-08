import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
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
    const { t } = useTranslation('common');

    const [messageEventCount, setMessageEventCount] = useState<number>(0);

    useEffect(() => {
        setMessageEventCount(
            headerBarMessageEvents.filter((message) => message.room_id === room._id).length
        );
    }, [headerBarMessageEvents, room._id]);

    return (
        <li
            className="rounded-md p-2 cursor-pointer hover:bg-gray-200 overflow-hidden whitespace-nowrap text-ellipsis"
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
                            ? `${
                                  memberProfileSnippets.find(
                                      (member) =>
                                          member.preferredUsername === room.last_message?.sender
                                  )?.name || room.last_message.sender
                              }: ${room.last_message.message}`
                            : t('no_messages_yet')}
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
