import React, { createContext, useState } from 'react';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import LayoutSection from '@/components/Layout/LayoutSection';
import Head from 'next/head';
import { SessionProvider } from "next-auth/react"

interface PlanId {
    planId: string,
    setPlanId: Function
}

export const PlanIdContext = React.createContext<PlanId>({planId: "", setPlanId: function(){}})

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {

    const [planId, setPlanId] = useState("")

    return (
        <>
            <PlanIdContext.Provider value={{planId, setPlanId}}>
                <SessionProvider session={session}>
                    <Head>
                        <title>Ve Collab</title>
                    </Head>
                    <LayoutSection>
                        <Component {...pageProps} />
                    </LayoutSection>
                </SessionProvider>
            </PlanIdContext.Provider>
        </>
    );
}
