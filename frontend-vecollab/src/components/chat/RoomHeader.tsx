import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';

interface Props {
    roomInfo: BackendChatroomSnippet;
    memberProfileSnippets: UserSnippet[];
}

export default function RoomHeader({ roomInfo, memberProfileSnippets }: Props) {
    return (
        <>
            {roomInfo.name ? (
                <div className="flex flex-col justify-center items-center h-16 bg-gray-200">
                    <p className="text-lg font-medium">{roomInfo.name}</p>
                    <p className="text-lg font-medium text-gray-500">
                        {memberProfileSnippets.map((member) => member.name).join(', ')}
                    </p>
                </div>
            ) : (
                <div className="flex justify-center items-center h-16 bg-gray-200">
                    <p className="text-lg font-medium">
                        {memberProfileSnippets.map((member) => member.name).join(', ')}
                    </p>
                </div>
            )}
        </>
    );
}
