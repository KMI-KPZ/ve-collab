import React from 'react';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
    return (
        <>
            <SessionProvider session={session}>
                <Head>
                    <title>Ve Collab</title>
                </Head>
                <LayoutSection>
                    <Component {...pageProps} />
                </LayoutSection>
            </SessionProvider>
        </>
    );
}
