import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';

interface Props {
    roomInfo: BackendChatroomSnippet;
}

export default function RoomHeader({ roomInfo }: Props) {
    return (
        <>
            {roomInfo.name ? (
                <div className="flex flex-col justify-center items-center h-16 bg-gray-200">
                    <p className="text-lg font-medium">{roomInfo.name}</p>
                    <p className="text-lg font-medium text-gray-500">
                        {roomInfo.members?.join(', ')}
                    </p>
                </div>
            ) : (
                <div className="flex justify-center items-center h-16 bg-gray-200">
                    <p className="text-lg font-medium">{roomInfo.members?.join(', ')}</p>
                </div>
            )}
        </>
    );
}
