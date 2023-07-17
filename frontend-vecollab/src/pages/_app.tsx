import React, { useEffect, useState } from 'react';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import Favicon from '@/components/metaTags/Favicon';
import LinkPreview from '@/components/metaTags/LinkPreview';
import { socket } from '@/lib/socket';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
    const [fooEvents, setFooEvents] = useState<any[]>([]);

    // don't do anything else inside this hook, especially with deps, because it would always
    // re-init the socket when the effect triggers
    // we only want to create it once during mount of this parent component
    useEffect(() => {
        socket.connect();

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
        function onFooEvent(value: any) {
            setFooEvents([...fooEvents, value]);
        }

        socket.on('foo', onFooEvent);

        return () => {
            socket.off('foo', onFooEvent);
        };
    }, [fooEvents]);

    return (
        <>
            <SessionProvider session={session}>
                <Head>
                    <title>Ve Collab</title>
                    <Favicon />
                    <LinkPreview />
                </Head>
                <LayoutSection>
                    <Component
                        {...pageProps}
                        socket={socket}
                        fooEvents={fooEvents}
                        setFooEvents={setFooEvents}
                    />
                </LayoutSection>
            </SessionProvider>
        </>
    );
}
