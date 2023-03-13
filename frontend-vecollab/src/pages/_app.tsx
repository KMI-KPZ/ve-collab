import React from 'react';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <title>Ve Collab</title>
            </Head>
            <LayoutSection>
                <Component {...pageProps} />
            </LayoutSection>
        </>
    );
}
