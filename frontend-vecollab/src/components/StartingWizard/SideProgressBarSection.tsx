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
        text: 'Projektname',
        link: '/startingWizard/generalInformation/1projectName',
        state: ProgressState.completed,
    },
    {
        text: 'Partner',
        link: '/startingWizard/generalInformation/2partners',
        state: ProgressState.notStarted,
    },
    {
        text: 'Institution',
        link: '/startingWizard/generalInformation/3institutions',
        state: ProgressState.notStarted,
    },
    {
        text: 'Lehrveranstaltungen',
        link: '/startingWizard/generalInformation/4participatingCourses',
        state: ProgressState.notStarted,
    },
    {
        text: 'Thema',
        link: '/startingWizard/generalInformation/5veTopic',
        state: ProgressState.notStarted,
    },
    {
        text: 'Zielgruppen',
        link: '/startingWizard/generalInformation/6targetGroups',
        state: ProgressState.notStarted,
    },
    {
        text: 'Sprachen',
        link: '/startingWizard/generalInformation/7languages',
        state: ProgressState.notStarted,
    },
    {
        text: 'Rahmenbedingungen',
        link: '/startingWizard/generalInformation/8formalConditions',
        state: ProgressState.notStarted,
    },
    {
        text: 'Zielgruppen Ziele',
        link: '/startingWizard/generalInformation/9goals',
        state: ProgressState.notStarted,
    },
    {
        text: 'Externe Beteiligte',
        link: '/startingWizard/generalInformation/10externalParties',
        state: ProgressState.notStarted,
    },
    {
        text: 'Kursformat',
        link: '/startingWizard/generalInformation/11courseFormat',
        state: ProgressState.notStarted,
    },
    {
        text: 'Lernumgebung',
        link: '/startingWizard/generalInformation/12learningPlatform',
        state: ProgressState.notStarted,
    },
    {
        text: 'Tools',
        link: '/startingWizard/generalInformation/13tools',
        state: ProgressState.notStarted,
    },
    {
        text: 'Frage Neuer Inhalt',
        link: '/startingWizard/generalInformation/14questionNewContent',
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
                    href={{
                        pathname: sideMenuStep.link,
                        query: { plannerId: router.query.plannerId },
                    }}
                    className={`flex bg-white p-2 w-full rounded-lg drop-shadow-lg`}
                >
                    <Image src={renderIcon(sideMenuStep.state)} alt="Ve Collab Logo"></Image>
                    <p
                        className={`ml-3 font-konnect ${
                            router.pathname == sideMenuStep.link
                                ? 'text-ve-collab-blue font-bold'
                                : ''
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
