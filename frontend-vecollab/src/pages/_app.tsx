import React, { useEffect, useState } from 'react';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import Favicon from '@/components/metaTags/Favicon';
import LinkPreview from '@/components/metaTags/LinkPreview';
import { socket } from '@/lib/socket';
import SocketAuthenticationProvider from '@/components/SocketAuthenticationProvider';
import { VeInvitation } from '@/interfaces/socketio';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
    const [notificationEvents, setNotificationEvents] = useState<VeInvitation[]>([]);

    // don't do anything else inside this hook, especially with deps, because it would always
    // re-init the socket when the effect triggers
    // we only want to create it once during mount of this parent component
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
    // that his _app component is always mounted
    useEffect(() => {
        function onNotifcationEvent(value: VeInvitation) {
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
                <SocketAuthenticationProvider>
                    <Head>
                        <title>Ve Collab</title>
                        <Favicon />
                        <LinkPreview />
                    </Head>
                    <LayoutSection notificationEvents={notificationEvents}>
                        <Component
                            {...pageProps}
                            socket={socket}
                            notificationEvents={notificationEvents}
                            setNotificationEvents={setNotificationEvents}
                        />
                    </LayoutSection>
                </SocketAuthenticationProvider>
            </SessionProvider>
        </>
    );
}
