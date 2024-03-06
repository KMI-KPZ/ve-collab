import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import imageGeneralInformation from '@/images/icons/progressBar/topProgressBar/generalInformation.svg';
import imageStagePlanner from '@/images/icons/progressBar/topProgressBar/stagePlanner.svg';
import imageFinePlanner from '@/images/icons/progressBar/topProgressBar/finePlanner.svg';
import imageFinish from '@/images/icons/progressBar/topProgressBar/finish.svg';
import Image from 'next/image';

export interface HeadMenuProgressStep {
    description: string;
    link: string;
    image: string;
}

interface HeadProgressBar {
    stage: number;
    linkFineStep: string;
}

export default function HeadProgressBarSection({ stage, linkFineStep }: HeadProgressBar) {
    const router = useRouter();

    if (linkFineStep === '' || linkFineStep === undefined) {
        linkFineStep = '/startingWizard/fineplanner';
    }

    const headMenuProgressSteps: HeadMenuProgressStep[] = [
        {
            description: 'Allgemeine Informationen',
            link: '/startingWizard/generalInformation/projectName',
            image: imageGeneralInformation,
        },
        {
            description: 'Etappenplaner',
            link: '/startingWizard/broadPlanner',
            image: imageStagePlanner,
        },
        {
            description: 'Feinplanner',
            link: `/startingWizard/fineplanner/${encodeURIComponent(linkFineStep)}`,
            image: imageFinePlanner,
        },
        {
            description: 'Abschluss',
            link: '/startingWizard/finish',
            image: imageFinish,
        },
    ];
    const [stateMenuProgressData] = useState<HeadMenuProgressStep[]>(headMenuProgressSteps);

    const [stateActiveProgressStage, setStateActiveProgressStage] = useState<number>(0);

    useEffect(() => {
        setStateActiveProgressStage(stage);
    }, [router.pathname, stateMenuProgressData, stage]);

    function renderHeadProgressBar(headMenuSteps: HeadMenuProgressStep[]): JSX.Element[] {
        return headMenuSteps.map((step, index) => (
            <Link
                key={index}
                href={{
                    pathname: step.link,
                    query: { plannerId: router.query.plannerId },
                }}
            >
                <div title={step.description} className="flex align-middle items-center">
                    <div
                        className={` w-10 h-10 border-4 rounded-full text-lg flex items-center justify-center
                    ${
                        stateActiveProgressStage < index
                            ? 'border-gray-400'
                            : 'border-ve-collab-blue shadow-roundBox shadow-blue-200'
                    }
                    `}
                    >
                        <span className="text-center text-ve-collab-blue">
                            <Image src={step.image} alt={`${step.description} logo`}></Image>
                        </span>
                    </div>
                    {headMenuSteps.length - 1 > index && (
                        <div className="relative">
                            <div
                                className={`w-40 border-2 top-0 left-0 ${
                                    stateActiveProgressStage <= index
                                        ? 'border-gray-400'
                                        : 'border-ve-collab-blue'
                                }`}
                            ></div>
                        </div>
                    )}
                </div>
            </Link>
        ));
    }

    return (
        <div className="flex">
            <div className="w-full">
                <nav className="flex w-full justify-center py-6">
                    {renderHeadProgressBar(headMenuProgressSteps)}
                </nav>
                <div className="flex justify-center">
                    <Link
                        href={`/etherpad?planID=${router.query.plannerId}`}
                        target="_blank"
                        className="mx-2"
                    >
                        <button
                            type="submit"
                            className="items-end border border-ve-collab-orange text-ve-collab-orange py-3 px-5 rounded-lg w-60"
                        >
                            kollaboratives Pad öffnen
                        </button>
                    </Link>
                    <Link
                        href={`/meeting?meetingId=${router.query.plannerId}`}
                        target="_blank"
                        className="mx-2"
                    >
                        <button
                            type="submit"
                            className="items-end border border-ve-collab-orange text-ve-collab-orange py-3 px-5 rounded-lg w-60"
                        >
                            Jitsi Raum betreten
                        </button>
                    </Link>
                </div>
            </div>
            <div className="w-80"></div>
        </div>
    );
}
