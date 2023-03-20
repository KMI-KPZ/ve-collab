import React, { useState } from 'react';
import completedImage from '@/images/icons/progressBar/completed.svg';
import uncompletedImage from '@/images/icons/progressBar/uncompleted.svg';
import notStartedImage from '@/images/icons/progressBar/notStarted.svg';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProgressState, SideMenuStep } from '@/interfaces/startingWizard/sideProgressBar';

export const sideMenuSteps: SideMenuStep[] = [
    {
        text: 'Essentielle Informationen',
        link: '/startingWizard/generalInformation/essentialInformation',
        state: ProgressState.completed,
    },
    {
        text: 'Kursinformationen',
        link: '/startingWizard/generalInformation/courseInformation',
        state: ProgressState.completed,
    },
    {
        text: 'Ziele',
        link: '/startingWizard/generalInformation/goals',
        state: ProgressState.completed,
    },
    {
        text: 'Tools',
        link: '/startingWizard/generalInformation/tools',
        state: ProgressState.uncompleted,
    },
    {
        text: 'Formale Rahmenbedingungen',
        link: '/startingWizard/generalInformation/formalGeneralConditions',
        state: ProgressState.notStarted,
    },
];

export default function SideProgressBarSection() {
    const router = useRouter();

    const [sideMenuStepsData] = useState<SideMenuStep[]>(sideMenuSteps);

    function renderIcon(state: ProgressState) {
        switch (state) {
            case 0:
                return completedImage;
            case 1:
                return notStartedImage;
            case 2:
            default:
                return uncompletedImage;
        }
    }
    function renderStageSteps(sideMenuStepsData: SideMenuStep[]): JSX.Element[] {
        return sideMenuStepsData.map((sideMenuStep, index) => (
            <li key={index}>
                <Link
                    href={sideMenuStep.link}
                    className={`flex bg-white p-2 w-full rounded-lg drop-shadow-lg`}
                >
                    <Image src={renderIcon(sideMenuStep.state)} alt="Ve Collab Logo"></Image>
                    <p
                        className={`ml-3 font-konnect ${
                            router.pathname == sideMenuStep.link ? 'text-ve-collab-blue' : ''
                        }`}
                    >
                        {sideMenuStep.text}
                    </p>
                </Link>
            </li>
        ));
    }
    return (
        <nav className="flex flex-col text-center w-80 shadow-inner mt-3 mb-3 bg-white rounded-xl">
            <div className="shadow-sm mb-3 rounded">
                <h2 className="mt-5 mb-4 font-konnect font-medium">Schritte</h2>{' '}
            </div>
            <ul className="flex flex-col gap-1 bg-white p-3">
                {renderStageSteps(sideMenuStepsData)}
            </ul>
        </nav>
    );
}
