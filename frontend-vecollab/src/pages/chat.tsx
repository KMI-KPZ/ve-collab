import ChatWindow from "@/components/chat/ChatWindow";
import Sidebar from "@/components/chat/Sidebar";
import { BackendChatroomSnippet } from "@/interfaces/api/apiInterfaces";
import { UserSnippet } from "@/interfaces/profile/profileInterfaces";
import { fetchPOST, useGetChatrooms } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import { MdArrowBackIosNew, MdOutlineChat } from "react-icons/md";
import { Socket } from "socket.io-client";

interface Props {
    socket: Socket;
    messageEvents: any[];
    setMessageEvents: Dispatch<SetStateAction<any[]>>;
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
}

Chat.auth = true;
export default function Chat(
{
    socket,
    messageEvents,
    setMessageEvents,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
}: Props
) {
    const { data: session } = useSession();

    if (!session) return ( <></> )

    const [open, setOpen] = useState<boolean>(false);
    // const [showRooms, setShowRooms] = useState<boolean>(true);
    const [selectedChat, setSelectedChat] = useState<string>('');
    const [selectedChatInfo, setSelectedChatInfo] = useState<BackendChatroomSnippet>();

    const [profileSnippets, setProfileSnippets] = useState<UserSnippet[]>([]);
    const [profileSnippetsLoading, setProfileSnippetsLoading] = useState<boolean>(true);

    const { data: roomSnippets, isLoading, error, mutate } = useGetChatrooms(session!.accessToken);

    // useEffect(() => {
    //     if (isLoading) return;

    //     // filter a distinct list of usernames from the room snippets
    //     const usernames = Array.from(new Set(roomSnippets.map((room) => room.members).flat()));

    //     // fetch profile snippets
    //     fetchPOST('/profile_snippets', { usernames: usernames }, session?.accessToken).then(
    //         (data) => {
    //             console.log(data);
    //             setProfileSnippets(
    //                 data.user_snippets.map((snippet: any) => {
    //                     return {
    //                         profilePicUrl: snippet.profile_pic,
    //                         name: snippet.first_name + ' ' + snippet.last_name,
    //                         preferredUsername: snippet.username,
    //                         institution: snippet.institution,
    //                     };
    //                 })
    //             );
    //             setProfileSnippetsLoading(false);
    //         }
    //     );
    // }, [isLoading, roomSnippets, session]);

    const handleChatSelect = (chat: string) => {
        // setShowRooms(false)
        setSelectedChat(chat)
        setSelectedChatInfo( roomSnippets.find(room => room._id === chat) )
    };

    return (
        <div className={`${open ? "w-1/6" : ""} absolute shadow z-50 right-0 top-1/4 px-2 py-4 rounded-l bg-white border`}>
            {open ? (
                <>
                    <div className="absolute right-2 -mt-8 px-1 bg-white rounded border">
                        <button onClick={() => { setOpen(false) }} className="">
                            <IoMdClose />
                        </button>
                    </div>

                    <div className="">
                        {selectedChat ? (
                            <>
                                <div className="flex items-center">
                                    <button onClick={() => { setSelectedChat('') }} className="flex items-center inline px-2">
                                        <MdArrowBackIosNew />&nbsp;
                                    </button>
                                    {selectedChatInfo?.name ? (
                                        <>
                                            <span className="font-bold">{selectedChatInfo.name}</span>&nbsp;|&nbsp;
                                            {selectedChatInfo.members.length} Mitglieder
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                                <div className="h-[60vh]">
                                    <ChatWindow
                                        selectedChatID={selectedChat}
                                        socketMessages={messageEvents}
                                        setSocketMessages={setMessageEvents}
                                        headerBarMessageEvents={headerBarMessageEvents}
                                        setHeaderBarMessageEvents={setHeaderBarMessageEvents}
                                        socket={socket}
                                        roomInfo={selectedChatInfo!}
                                        memberProfileSnippets={[]}
                                        // memberProfileSnippets={profileSnippets.filter((profileSnippet) =>
                                        //     roomSnippets
                                        //         .find((room) => room._id === selectedChat)!
                                        //         .members.includes(profileSnippet.preferredUsername)
                                        // )}
                                    />
                                </div>

                                {/* // <form className="flex items-center">
                                //         <input
                                //                 className={'border border-[#cccccc] rounded-md px-2 py-[6px] w-full'}
                                //                 type="text"
                                //                 placeholder={'message ...'}
                                //                 name='text'
                                //                 autoComplete="off"
                                //             />
                                //         <button className="p-2" type='submit' title="Senden"><IoIosSend /></button>
                                //     </form> */}
                            </>

                        ) : (
                            <div className="h-[60vh]">
                                <Sidebar
                                    handleChatSelect={handleChatSelect}
                                    headerBarMessageEvents={[]}
                                    profileSnippets={profileSnippets}
                                />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <button onClick={() => setOpen(true)}><MdOutlineChat size={40} /></button>
            )}
        </div>
    )
}