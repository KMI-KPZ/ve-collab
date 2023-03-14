import React from 'react';
import { sideMenuStepsGeneralInformation } from '../../../frontendData/startingWizard/sideProgressBarData';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';

export default function Goals() {
    return (
        <main className="flex justify-between">
            <div> hello </div>
            <SideProgressBarSection sideMenuSteps={sideMenuStepsGeneralInformation} />
        </main>
    );
}
