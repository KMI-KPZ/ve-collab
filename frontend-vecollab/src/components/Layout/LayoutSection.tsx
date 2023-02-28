import React from 'react';
import HeaderSection from '@/components/Layout/HeaderSection';
import FooterSection from '@/components/Layout/FooterSection';

interface Props {
    children: React.ReactNode;
}
export default function LayoutSection({ children }: Props): JSX.Element {
    return (
        <>
            <HeaderSection />
            <main>{children}</main>
            <FooterSection />
        </>
    );
}
