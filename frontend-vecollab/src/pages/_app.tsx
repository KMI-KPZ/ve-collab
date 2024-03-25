import React, { useEffect, useState } from 'react';
import '@/styles/globals.css';
import '@/styles/networkPostsFormatter.css';


import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';
import Head from 'next/head';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import Favicon from '@/components/metaTags/Favicon';
import LinkPreview from '@/components/metaTags/LinkPreview';
import { socket } from '@/lib/socket';
import SocketAuthenticationProvider from '@/components/SocketAuthenticationProvider';
import { Notification } from '@/interfaces/socketio';
import { NextComponentType, NextPageContext } from 'next';
import LoadingAnimation from '@/components/LoadingAnimation';
import { CookiesProvider } from 'react-cookie';
import ChatWindow from '@/components/chat/ChatWindow';

declare type ComponentWithAuth = NextComponentType<NextPageContext, any, any> & {
    auth?: boolean;
};
declare type AppPropsWithAuth = AppProps & {
    Component: ComponentWithAuth;
};
// any component that defines Component.auth = true will be wrapped inside this component,
// which triggers a relogin flow (if not autoForward=false) if the session does not validate
// meaning that inside a component no session check is required, one can
// be assured that the component is onyl rendered if the session is valid.
function Auth({
    autoForward=true,
    showLoader=true,
    children
} : {
    autoForward?: boolean,
    showLoader?: boolean,
    children: JSX.Element
}): JSX.Element {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return showLoader ? <LoadingAnimation /> : <></>;
    }
    else if (!session || session?.error === 'RefreshAccessTokenError') {
            console.log('forced new signIn');
            if (autoForward === true) {
                signIn('keycloak');
            }
            return <></>;
    }
    else {
        return children;
    }
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppPropsWithAuth) {
    const [notificationEvents, setNotificationEvents] = useState<Notification[]>([]);
    const [messageEvents, setMessageEvents] = useState<any[]>([]);
    const [chatOpen, setChatOpen] = useState<boolean>(false);

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
                console.log('new notification:');
                console.log(value);
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
        setChatOpen(!chatOpen)
    }

    return (
        <>
            <SessionProvider session={session}>
                <CookiesProvider defaultSetOptions={{ path: '/' }}>
                    <SocketAuthenticationProvider>
                        <Head>
                            <title>Ve Collab</title>
                            <Favicon />
                            <LinkPreview />
                        </Head>
                        <LayoutSection
                            notificationEvents={notificationEvents}
                            headerBarMessageEvents={messageEventsHeaderBar}
                            toggleChatWindow={toggleChatWindow}
                        >
                            <>
                                <Auth showLoader={false} autoForward={false} children={
                                    <ChatWindow
                                        socket={socket}
                                        messageEvents={messageEvents}
                                        headerBarMessageEvents={messageEventsHeaderBar}
                                        setHeaderBarMessageEvents={setMessageEventsHeaderBar}
                                        open={chatOpen}
                                        toggleChatWindow={toggleChatWindow}
                                    />
                                } />

                                {Component.auth ? (
                                    <Auth>
                                        <Component
                                            {...pageProps}
                                            socket={socket}
                                            notificationEvents={notificationEvents}
                                            setNotificationEvents={setNotificationEvents}
                                            messageEvents={messageEvents}
                                            setMessageEvents={setMessageEvents}
                                            headerBarMessageEvents={messageEventsHeaderBar}
                                            setHeaderBarMessageEvents={setMessageEventsHeaderBar}
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
                                    />
                                )}
                            </>
                        </LayoutSection>
                    </SocketAuthenticationProvider>
                </CookiesProvider>
            </SessionProvider>
        </>
    );
}
