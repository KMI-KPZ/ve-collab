import { BackendChatroomSnippet } from "@/interfaces/api/apiInterfaces";
import { UserSnippet } from "@/interfaces/profile/profileInterfaces";
import { fetchPOST, useGetChatrooms } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { MdKeyboardDoubleArrowRight } from "react-icons/md";
import { Socket } from "socket.io-client";
import LoadingAnimation from "../LoadingAnimation";
import ChatRoom from "./ChatRoom";
import Rooms from "@/components/chat/Rooms";

interface Props {
    socket: Socket;
    messageEvents: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    toggleChatWindow: () => void
    open: boolean
}

ChatWindow.auth = true;
export default function ChatWindow(
{
    socket,
    messageEvents,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    toggleChatWindow,
    open,
}: Props
) {
    const { data: session } = useSession();
    const [selectedRoom, setSelectedRoom] = useState<BackendChatroomSnippet>();
    const [profileSnippets, setProfileSnippets] = useState<UserSnippet[]>([]);
    const [profileSnippetsLoading, setProfileSnippetsLoading] = useState<boolean>(true);

    const { data: rooms, isLoading: loadingRooms, error, mutate } = useGetChatrooms(session!.accessToken);

    useEffect(() => {
        if (loadingRooms) return;

        // filter a distinct list of usernames from the room snippets
        const usernames = Array.from(new Set(rooms.map((room) => room.members).flat()));

        // fetch profile snippets
        fetchPOST('/profile_snippets', { usernames: usernames }, session?.accessToken).then(
            (data) => {
                console.log(data);
                setProfileSnippets(
                    data.user_snippets.map((snippet: any) => {
                        return {
                            profilePicUrl: snippet.profile_pic,
                            name: snippet.first_name + ' ' + snippet.last_name,
                            preferredUsername: snippet.username,
                            institution: snippet.institution,
                        };
                    })
                );
                setProfileSnippetsLoading(false);
            }
        );
    }, [loadingRooms, rooms, session]);

    const handleChatSelect = (chat: string) => {
        setSelectedRoom( rooms.find(room => room._id === chat) )
    };

    if (!open) { return (<></>) }

    return (
        <div className={`absolute z-30 right-0 top-20 w-1/5 min-w-[15rem] min-h-[18rem] px-2 py-4 shadow rounded-l bg-white border`}>
            <div style={{clipPath: 'inset(-5px 1px -5px -5px)', borderRight: '0'}}
                className="absolute flex top-1/3 -ml-2 -left-[16px] w-[26px] h-[90px] bg-white rounded-l border shadow"
            >
                <button onClick={e => toggleChatWindow()} className="p-1 h-full w-full hover:bg-slate-100">
                    <MdKeyboardDoubleArrowRight />
                </button>
            </div>

            {(selectedRoom) ? (
                <div className="h-[60vh] min-h-[16rem] flex flex-col">
                    <ChatRoom
                        socketMessages={messageEvents}
                        headerBarMessageEvents={headerBarMessageEvents}
                        setHeaderBarMessageEvents={setHeaderBarMessageEvents}
                        socket={socket}
                        room={selectedRoom!}
                        closeRoom={() => setSelectedRoom(undefined)}
                        memberProfileSnippets={profileSnippets.filter(profile =>
                            selectedRoom.members.includes(profile.preferredUsername)
                        )}
                    />
                </div>
            ) : (
                <div className="h-[60vh] min-h-[16rem]">
                    {profileSnippetsLoading ? (
                        <LoadingAnimation size="small" />
                    ) : (
                        <Rooms
                            handleChatSelect={handleChatSelect}
                            headerBarMessageEvents={headerBarMessageEvents}
                            profileSnippets={profileSnippets}
                        />
                    )}
                </div>
            )}
        </div>
    )
}