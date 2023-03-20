import React from 'react';
import { sideMenuStepsGeneralInformation } from '../../../frontendData/startingWizard/sideProgressBarData';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';

export default function CourseInformation() {
    return (
        <main className="flex flex-col">
            <HeadProgressBarSection />
            <div className="flex justify-between">
                <div> hello </div>
                <SideProgressBarSection sideMenuSteps={sideMenuStepsGeneralInformation} />
            </div>
        </main>
    );
}
