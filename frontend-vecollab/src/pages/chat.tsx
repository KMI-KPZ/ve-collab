import ChatPanel from '@/components/chat/ChatPanel';
import { useChatProfileSnippets } from '@/components/chat/useChatProfileSnippets';
import CustomHead from '@/components/metaData/CustomHead';
import { useGetChatrooms } from '@/lib/backend';
import { GetServerSidePropsContext } from 'next';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { Dispatch, SetStateAction, useEffect, type JSX } from 'react';
import { MdCloseFullscreen } from 'react-icons/md';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
    messageEvents: any[];
    headerBarMessageEvents: any[];
    setHeaderBarMessageEvents: Dispatch<SetStateAction<any[]>>;
    chatRoomId: string | null;
    selectChatRoom: (roomId: string | null) => void;
    removeChatRoom: (roomId: string) => void;
    openChatWindow: () => void;
}

// only return to pages of the platform itself
const isInternalPath = (path: unknown): path is string =>
    typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');

Chat.auth = true;
Chat.autoForward = true;
export default function Chat({
    socket,
    messageEvents,
    headerBarMessageEvents,
    setHeaderBarMessageEvents,
    chatRoomId,
    selectChatRoom,
    removeChatRoom,
    openChatWindow,
}: Props): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const router = useRouter();

    const { data: rooms, isLoading: loadingRooms } = useGetChatrooms(session!.accessToken);
    const { profileSnippets, isLoading: profileSnippetsLoading } = useChatProfileSnippets(
        rooms,
        loadingRooms,
        true,
        session?.accessToken
    );

    // the room in the url wins on load (maximized window, reload, link),
    // afterwards the url follows the selection
    const queryRoom = typeof router.query.room === 'string' ? router.query.room : null;
    useEffect(() => {
        if (router.isReady && queryRoom) selectChatRoom(queryRoom);
    }, [router.isReady, queryRoom, selectChatRoom]);

    const selectRoom = (roomId: string | null) => {
        selectChatRoom(roomId);
        const query: Record<string, string> = {};
        if (roomId) query.room = roomId;
        if (isInternalPath(router.query.from)) query.from = router.query.from;
        router.replace({ pathname: '/chat', query }, undefined, { shallow: true });
    };

    const minimize = () => {
        openChatWindow();
        router.push(isInternalPath(router.query.from) ? router.query.from : '/');
    };

    return (
        <>
            <CustomHead pageTitle={t('chats')} pageSlug="chat" />
            <div
                className="mx-auto flex max-w-7xl flex-col px-4 py-4"
                style={{ height: 'calc(100vh - 120px)' }}
            >
                <div className="mb-3 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-ve-collab-blue">{t('chats')}</h1>
                    <button
                        type="button"
                        onClick={minimize}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                    >
                        <MdCloseFullscreen size={18} />
                        {t('chat_minimize')}
                    </button>
                </div>
                <div className="min-h-0 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <ChatPanel
                        socket={socket}
                        messageEvents={messageEvents}
                        headerBarMessageEvents={headerBarMessageEvents}
                        setHeaderBarMessageEvents={setHeaderBarMessageEvents}
                        profileSnippets={profileSnippets}
                        profileSnippetsLoading={profileSnippetsLoading}
                        selectedRoomId={chatRoomId}
                        onSelectRoom={selectRoom}
                        onRoomDeleted={(roomId) => {
                            removeChatRoom(roomId);
                            selectRoom(null);
                        }}
                        wide
                    />
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
