import React from 'react';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';

export default function Goals() {
    return (
        <main className="flex flex-col">
            <HeadProgressBarSection />
            <div className="flex justify-between">
                <div> hello </div>
                <SideProgressBarSection />
            </div>
        </main>
    );
}
