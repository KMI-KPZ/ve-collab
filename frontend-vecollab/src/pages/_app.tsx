import React, { createContext, useEffect, useState } from 'react';
import '@/styles/globals.css';
import '@/styles/networkPostsFormatter.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/layout/LayoutSection';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { socket } from '@/lib/socket';
import SocketAuthenticationProvider from '@/components/SocketAuthenticationProvider';
import { Notification } from '@/interfaces/socketio';
import { NextComponentType, NextPageContext } from 'next';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { CookiesProvider } from 'react-cookie';
import NotificationsWindow from '@/components/notifications/NotificationsWindow';
import ChatWindow from '@/components/chat/ChatWindow';
import { appWithTranslation, useTranslation } from 'next-i18next';
import VEHead from '@/components/metaData/VEHead';

export const SocketContext = createContext(socket);

declare type ComponentWithAuth = NextComponentType<NextPageContext, any, any> & {
    auth?: boolean;
    autoForward?: boolean;
    wrapsPopupComponent?: boolean;
    noAuthPreview?: JSX.Element;
};
declare type AppPropsWithAuth = AppProps & {
    Component: ComponentWithAuth;
};
// any component that defines Component.auth = true will be wrapped inside this component,
// which triggers a relogin flow (if not autoForward=false) if the session does not validate
// meaning that inside a component no session check is required, one can
// be assured that the component is onyl rendered if the session is valid.
function Auth({
    autoForward = false,
    showLoader = true,
    wrapsPopupComponent = false,
    noAuthPreview,
    children,
}: {
    autoForward?: boolean;
    showLoader?: boolean;
    wrapsPopupComponent?: boolean;
    noAuthPreview?: JSX.Element;
    children: JSX.Element;
}): JSX.Element {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    if (status === 'loading') {
        return showLoader ? <LoadingAnimation /> : <></>;
    } else if (!session || session?.error === 'RefreshAccessTokenError') {
        console.log('forced new signIn');
        if (autoForward === true) {
            signIn('keycloak');
        }
        if (wrapsPopupComponent) {
            return <></>;
        }
        return (
            <div className="relative min-h-screen">
                {noAuthPreview}
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-5 bg-white border border-gray-300 shadow-lg z-50">
                    <p>{t("no_auth.page_behind_login")}</p>
                    <div className="flex mt-10">
                        <button
                            className={
                                'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={() => signIn('keycloak')}
                        >
                            <span>{t('register')}</span>
                        </button>
                        <button
                            className={
                                'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={() => signIn('keycloak')}
                        >
                            <span>{t('login')}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    } else {
        return children;
    }
}

const App = ({ Component, pageProps: { session, ...pageProps } }: AppPropsWithAuth) => {
    const [notificationEvents, setNotificationEvents] = useState<Notification[]>([]);
    const [messageEvents, setMessageEvents] = useState<any[]>([]);
    const [chatOpen, setChatOpen] = useState<boolean>(false);
    const [notifOpen, setNotifOpen] = useState<boolean>(false);

    // it is a pain:
    // the headerbar has to get a state copy of the messageEvents, because in order to remove the
    // notification badge, the events have to be deleted from its list
    // BUT we cannot directly delete the messageEvents, because they need to be rendered by the chat component (which would be de-rendered once deleted from the list)
    // hence: copy to the headerbar and once message get acknowledged, the chat component will remove them from the copy-list,
    // triggering the re-render of the notification badge in the header bar, but not the chat components
    const [messageEventsHeaderBar, setMessageEventsHeaderBar] = useState<any[]>([]);

    // don't do anything else inside this hook, especially with deps, because it would always
    // re-init the socket when the effect triggers
    // we only want to connect it once during mount of this root component
    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.disconnect();
        };
    }, []);

    // bind handlers onto the events
    // do not listen for events inside components, because if the component is not
    // mounted, the event could be missed. For that reason we bind it globally
    // and dispatch only the list of events into the components, since we know
    // that this _app component is always mounted
    useEffect(() => {
        function onNotifcationEvent(value: Notification) {
            // nextjs always sends 2 requests in dev mode, prevent any notification from appearing twice
            const alreadyExisting = notificationEvents.find(
                (notification) => notification._id === value._id
            );
            if (alreadyExisting === undefined) {
                // console.log('new notification:', {value});
                setNotificationEvents([value, ...notificationEvents]);
            }
        }

        function onMessageEvent(value: any) {
            // nextjs always sends 2 requests in dev mode, prevent any message from appearing twice
            const alreadyExisting = messageEvents.find((message) => message._id === value._id);
            if (alreadyExisting === undefined) {
                console.log('new message:');
                console.log(value);
                setMessageEvents([...messageEvents, value]);
                setMessageEventsHeaderBar((prev) => [...prev, value]);
            }
        }

        socket.on('notification', onNotifcationEvent);
        socket.on('message', onMessageEvent);

        return () => {
            socket.off('notification', onNotifcationEvent);
            socket.off('message', onMessageEvent);
        };
    }, [notificationEvents, messageEvents]);

    const toggleChatWindow = () => {
        setNotifOpen(false);
        setChatOpen(!chatOpen);
    };

    const toggleNotifWindow = () => {
        setChatOpen(false);
        setNotifOpen(!notifOpen);
    };

    return (
        <>
            <SessionProvider session={session} refetchInterval={5 * 60}>
                <CookiesProvider defaultSetOptions={{ path: '/' }}>
                    <SocketAuthenticationProvider>
                        <SocketContext.Provider value={socket}>
                            <VEHead />
                            <LayoutSection
                                notificationEvents={notificationEvents}
                                headerBarMessageEvents={messageEventsHeaderBar}
                                toggleChatWindow={toggleChatWindow}
                                toggleNotifWindow={toggleNotifWindow}
                            >
                                <>
                                    <Auth
                                        showLoader={false}
                                        autoForward={false}
                                        wrapsPopupComponent={true}
                                    >
                                        <>
                                            <ChatWindow
                                                socket={socket}
                                                messageEvents={messageEvents}
                                                headerBarMessageEvents={messageEventsHeaderBar}
                                                setHeaderBarMessageEvents={
                                                    setMessageEventsHeaderBar
                                                }
                                                open={chatOpen}
                                                toggleChatWindow={toggleChatWindow}
                                            />
                                            <NotificationsWindow
                                                socket={socket}
                                                notificationEvents={notificationEvents}
                                                setNotificationEvents={setNotificationEvents}
                                                open={notifOpen}
                                                toggleNotifWindow={toggleNotifWindow}
                                            />
                                        </>
                                    </Auth>

                                    {Component.auth ? (
                                        <Auth
                                            autoForward={Component.autoForward ?? false}
                                            wrapsPopupComponent={
                                                Component.wrapsPopupComponent ?? false
                                            }
                                            noAuthPreview={Component.noAuthPreview}
                                        >
                                            <Component
                                                {...pageProps}
                                                socket={socket}
                                                notificationEvents={notificationEvents}
                                                setNotificationEvents={setNotificationEvents}
                                                messageEvents={messageEvents}
                                                setMessageEvents={setMessageEvents}
                                                headerBarMessageEvents={messageEventsHeaderBar}
                                                setHeaderBarMessageEvents={
                                                    setMessageEventsHeaderBar
                                                }
                                                toggleNotifWindow={toggleNotifWindow}
                                            />
                                        </Auth>
                                    ) : (
                                        <Component
                                            {...pageProps}
                                            socket={socket}
                                            notificationEvents={notificationEvents}
                                            setNotificationEvents={setNotificationEvents}
                                            messageEvents={messageEvents}
                                            setMessageEvents={setMessageEvents}
                                            headerBarMessageEvents={messageEventsHeaderBar}
                                            setHeaderBarMessageEvents={setMessageEventsHeaderBar}
                                            toggleNotifWindow={toggleNotifWindow}
                                        />
                                    )}
                                </>
                            </LayoutSection>
                        </SocketContext.Provider>
                    </SocketAuthenticationProvider>
                </CookiesProvider>
            </SessionProvider>
        </>
    );
};
export default appWithTranslation(App);
