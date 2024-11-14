import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document';
import VEHead from '@/components/metaData/VEHead';

export default function Document() {
    return (
        <Html lang="en">
            <Head />

            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
