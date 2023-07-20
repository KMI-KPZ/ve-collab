import React, { useState } from 'react';
import completedImage from '@/images/icons/progressBar/completed.svg';
import notStartedImage from '@/images/icons/progressBar/notStarted.svg';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    ProgressState,
    SideMenuStep,
    ISideProgressBarStates,
} from '@/interfaces/startingWizard/sideProgressBar';

export const sideMenuSteps: SideMenuStep[] = [
    {
        text: 'Projektname',
        id: 'name',
        link: '/startingWizard/generalInformation/projectName',
    },
    {
        text: 'Partner',
        id: 'involved_parties',
        link: '/startingWizard/generalInformation/partners',
    },
    {
        text: 'Externe Beteiligte',
        id: 'involved_parties',
        link: '/startingWizard/generalInformation/externalParties',
    },
    {
        text: 'Institution',
        id: 'institutions',
        link: '/startingWizard/generalInformation/institutions',
    },
    {
        text: 'Lehrveranstaltungen',
        id: 'lectures',
        link: '/startingWizard/generalInformation/participatingCourses',
    },
    {
        text: 'Zielgruppen',
        id: 'audience',
        link: '/startingWizard/generalInformation/targetGroups',
    },
    {
        text: 'Thema',
        id: 'topic',
        link: '/startingWizard/generalInformation/veTopic',
    },
    {
        text: 'Sprachen',
        id: 'languages',
        link: '/startingWizard/generalInformation/languages',
    },
    {
        text: 'neue Inhalte',
        id: 'new_content',
        link: '/startingWizard/generalInformation/questionNewContent',
    },
    {
        text: 'Digitale Umsetzung',
        id: 'realization',
        link: '/startingWizard/generalInformation/courseFormat',
    },
    {
        text: 'Digitale Lernumgebung',
        id: 'learning_env',
        link: '/startingWizard/generalInformation/learningPlatform',
    },
    {
        text: 'Tools',
        id: 'tools',
        link: '/startingWizard/generalInformation/tools',
    },
    {
        text: 'formale Rahmenbedingungen',
        id: 'formalities',
        link: '/startingWizard/generalInformation/formalConditions',
    },
    {
        text: 'Etappenplanung',
        id: 'steps',
        link: '/startingWizard/broadPlanner',
    },
    {
        text: 'didaktische Feinplanung',
        id: 'steps',
        link: '/startingWizard/finePlanner',
    },
];

interface SideProgressBarSectionProps {
    progressState: ISideProgressBarStates;
}

export default function SideProgressBarSection({
    progressState,
}: SideProgressBarSectionProps): JSX.Element {
    const router = useRouter();

    const [sideMenuStepsData] = useState<SideMenuStep[]>(sideMenuSteps);

    function renderIcon(state: ProgressState) {
        switch (state) {
            case ProgressState.completed:
                return completedImage;
            case ProgressState.notStarted:
                return notStartedImage;
            case ProgressState.uncompleted:
            default:
                return notStartedImage;
        }
    }

    const getProgressState = (key: keyof ISideProgressBarStates) => {
        if (progressState !== undefined) {
            return progressState[key];
        }
        return ProgressState.notStarted;
    };

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
                    <Image
                        src={renderIcon(
                            getProgressState(sideMenuStep.id as keyof ISideProgressBarStates)
                        )}
                        alt="Ve Collab Logo"
                    ></Image>
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
