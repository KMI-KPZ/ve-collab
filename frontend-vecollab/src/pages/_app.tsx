import React, { useEffect, useState } from 'react';
import '@/styles/globals.css';
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

declare type ComponentWithAuth = NextComponentType<NextPageContext, any, any> & {
    auth?: boolean;
};
declare type AppPropsWithAuth = AppProps & {
    Component: ComponentWithAuth;
};
// any component that defines Component.auth = true will be wrapped inside this component,
// which triggers a relogin flow if the session does not validate
// meaning that inside a component no session check is required, one can
// be assured that the component is onyl rendered if the session is valid.
function Auth({ children }: { children: JSX.Element }): JSX.Element {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return <LoadingAnimation />;
    } else {
        if (!session || session?.error === 'RefreshAccessTokenError') {
            console.log('forced new signIn');
            signIn('keycloak');
        }
    }

    return children;
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppPropsWithAuth) {
    const [notificationEvents, setNotificationEvents] = useState<Notification[]>([]);

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

        socket.on('notification', onNotifcationEvent);

        return () => {
            socket.off('notification', onNotifcationEvent);
        };
    }, [notificationEvents]);

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
                        <LayoutSection notificationEvents={notificationEvents}>
                            {Component.auth ? (
                                <Auth>
                                    <Component
                                        {...pageProps}
                                        socket={socket}
                                        notificationEvents={notificationEvents}
                                        setNotificationEvents={setNotificationEvents}
                                    />
                                </Auth>
                            ) : (
                                <Component
                                    {...pageProps}
                                    socket={socket}
                                    notificationEvents={notificationEvents}
                                    setNotificationEvents={setNotificationEvents}
                                />
                            )}
                        </LayoutSection>
                    </SocketAuthenticationProvider>
                </CookiesProvider>
            </SessionProvider>
        </>
    );
}
