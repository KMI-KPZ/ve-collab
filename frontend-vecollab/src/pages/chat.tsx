import ChatWindow from "@/components/chat/ChatWindow";
import Sidebar from "@/components/chat/Sidebar";
import { BackendChatroomSnippet } from "@/interfaces/api/apiInterfaces";
import { UserSnippet } from "@/interfaces/profile/profileInterfaces";
import { fetchPOST, useGetChatrooms } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import { MdArrowBackIosNew, MdKeyboardDoubleArrowRight, MdOutlineChat } from "react-icons/md";
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

    const [open, setOpen] = useState<boolean>(false);
    const [selectedChat, setSelectedChat] = useState<string>('');
    const [selectedChatInfo, setSelectedChatInfo] = useState<BackendChatroomSnippet>();

    const [messageEventCount, setMessageEventCount] = useState<number>(0);

    const [profileSnippets, setProfileSnippets] = useState<UserSnippet[]>([]);
    const [profileSnippetsLoading, setProfileSnippetsLoading] = useState<boolean>(true);

    const { data: roomSnippets, isLoading, error, mutate } = useGetChatrooms(session!.accessToken);

    useEffect(() => {
        //filter out the messages that the user sent himself --> they should not trigger a notification icon
        const filteredMessageEvents = headerBarMessageEvents.filter((message) => {
            return message.sender !== session?.user.preferred_username;
        });
        setMessageEventCount(filteredMessageEvents.length);
    }, [headerBarMessageEvents, session]);

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
        setSelectedChat(chat)
        setSelectedChatInfo( roomSnippets.find(room => room._id === chat) )
    };

    if (!open) {
        return (
            <div className={`absolute shadow z-50 right-0 top-1/4 p-4 rounded-l bg-white hover:bg-slate-100 border cursor-pointer `} onClick={() => setOpen(true)}>
                <button  className="">
                    <MdOutlineChat size={40} />
                    {messageEventCount > 0 && (
                        <span className="absolute top-1 px-2 py-1 rounded-full bg-blue-500/75 text-xs font-semibold">
                            {messageEventCount}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className={`w-1/5 min-w-[15rem] absolute shadow z-50 right-0 top-1/4 px-2 py-4 rounded-l bg-white border`}>
            <div style={{clipPath: 'inset(-5px 1px -5px -5px)', borderRight: '0'}}
                className="absolute flex top-1/3 -ml-2 -left-[16px] w-[26px] h-[90px] bg-white rounded-l border shadow"
            >
                <button onClick={() => { setOpen(false) }} className="p-1 h-full w-full hover:bg-slate-100">
                    <MdKeyboardDoubleArrowRight />
                </button>
            </div>

            {selectedChat ? (
                <>
                    <div className="flex flex-nowrap text-nowrap items-center overflow-hidden mb-2">
                        <button onClick={() => { setSelectedChat('') }} className="flex rounded-full items-center inline px-1 mr-1 hover:bg-slate-100">
                            <MdArrowBackIosNew />&nbsp;
                        </button>
                        {selectedChatInfo?.name ? (
                            <>
                                <span className="font-bold">{selectedChatInfo.name}</span>&nbsp;|&nbsp;
                                {selectedChatInfo.members.length}&nbsp;Mitglieder
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
                            // TODO are these may still required?!?
                            // memberProfileSnippets={profileSnippets.filter((profileSnippet) =>
                            //     roomSnippets
                            //         .find((room) => room._id === selectedChat)!
                            //         .members.includes(profileSnippet.preferredUsername)
                            // )}
                        />
                    </div>
                </>

            ) : (
                <div className="h-[60vh]">
                    <Sidebar
                        handleChatSelect={handleChatSelect}
                        headerBarMessageEvents={headerBarMessageEvents}
                        profileSnippets={profileSnippets}
                    />
                </div>
            )}
        </div>
    )
}