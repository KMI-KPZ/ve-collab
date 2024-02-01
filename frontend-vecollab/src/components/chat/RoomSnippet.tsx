import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';

interface Props {
    room: BackendChatroomSnippet;
    handleChatSelect: (chat: string) => void;
    headerBarMessageEvents: any[];
}

export default function RoomSnippet({ room, handleChatSelect, headerBarMessageEvents }: Props) {
    return (
        <li
            className="bg-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-300 overflow-hidden whitespace-nowrap text-ellipsis"
            onClick={() => handleChatSelect(room._id)}
        >
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <p className="text-lg font-medium">
                        {room.name ? room.name : room.members.join(', ')}
                    </p>
                    <p className="text-sm text-gray-500">
                        {room.last_message?.message
                            ? `${room.last_message.sender}: ${room.last_message.message}`
                            : 'No messages yet'}
                    </p>
                </div>

                {/* determine if there are any unread messages in this room, 
                by using the copy of message events that get deleted once they are acknowledged */}
                {headerBarMessageEvents.filter((message) => message.room_id === room._id).length >
                    0 && <div className="bg-blue-500 w-2 h-2 rounded-full mr-2"></div>}
            </div>
        </li>
    );
}
