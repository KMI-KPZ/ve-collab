import React from 'react';
import './../styles/globals.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <LayoutSection>
            <Component {...pageProps} />
        </LayoutSection>
    );
}
