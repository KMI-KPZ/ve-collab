import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { MdOutlineGroup } from 'react-icons/md';
import UserProfileImage from '../network/UserProfileImage';

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
    const otherUser =
        memberProfileSnippets.length == 2
            ? memberProfileSnippets.find(
                  (member) => member.preferredUsername !== session?.user.preferred_username
              )
            : undefined;

    return (
        <li
            className="rounded-md py-2 cursor-pointer hover:bg-gray-200 overflow-hidden whitespace-nowrap text-ellipsis"
            onClick={() => handleChatSelect(room._id)}
        >
            <div className="flex items-center px-1">
                <div className="flex-none">
                    {memberProfileSnippets.length > 2 ? (
                        <MdOutlineGroup
                            size={30}
                            className="text-gray-400 shrink-0 ml-1 mr-2 rounded-full bg-white"
                        />
                    ) : (
                        <UserProfileImage
                            profile_pic={otherUser?.profilePicUrl}
                            chosen_achievement={otherUser?.chosen_achievement}
                            width={30}
                            height={30}
                        />
                    )}
                </div>

                <div className="flex flex-col truncate">
                    {typeof room.name === 'string' && (
                        <p className="text-lg font-medium truncate" title={room.name}>
                            {room.name}
                        </p>
                    )}

                    <div className="text-sm flex items-center gap-x-1 truncate">
                        <div className="flex truncate">
                            {memberProfileSnippets.length > 2 ? (
                                memberProfileSnippets.map((member, i) => (
                                    <div key={i} className="truncate">
                                        <span className="max-w-1/3 truncate">{member.name}</span>
                                        {i + 1 < memberProfileSnippets.length && <>,&nbsp;</>}
                                    </div>
                                ))
                            ) : (
                                <div className="truncate">{otherUser?.name}</div>
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 truncate flex">
                        {room.last_message?.message ? (
                            <>
                                <span className="inline-block max-w-50 truncate">
                                    {memberProfileSnippets.find(
                                        (member) =>
                                            member.preferredUsername === room.last_message?.sender
                                    )?.name || room.last_message.sender}
                                </span>
                                :&nbsp;<span className="truncate">{room.last_message.message}</span>
                            </>
                        ) : (
                            t('no_messages_yet')
                        )}
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
