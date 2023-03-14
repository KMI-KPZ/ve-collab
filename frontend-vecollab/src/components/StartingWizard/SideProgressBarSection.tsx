import React from 'react';
import completedImage from '@/images/icons/progressBar/completed.svg';
import uncompletedImage from '@/images/icons/progressBar/uncompleted.svg';
import notStartedImage from '@/images/icons/progressBar/notStarted.svg';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    ProgressState,
    SideProgressBar,
    SideMenuStep,
} from '@/interfaces/startingWizard/sideProgressBar';

export default function SideProgressBarSection({ sideMenuSteps }: SideProgressBar) {
    const router = useRouter();

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
    function renderStageSteps(sideMenuSteps: SideMenuStep[]): JSX.Element[] {
        return sideMenuSteps.map((sideMenuStep, index) => (
            <li key={index}>
                <Link
                    href={sideMenuStep.link}
                    className={`flex bg-white p-2 w-full rounded-lg active:bg-blue-200 ${
                        router.pathname == sideMenuStep.link ? 'border-2 border-black' : ''
                    }`}
                >
                    <Image src={renderIcon(sideMenuStep.state)} alt="Ve Collab Logo"></Image>
                    <p className="ml-3 font-konnect">{sideMenuStep.text}</p>
                </Link>
            </li>
        ));
    }
    return (
        <nav className="flex flex-col text-center w-80 shadow-inner mt-3 mb-3">
            <div className="bg-slate-400 drop-shadow-lg">
                <h2 className="mt-5 mb-4 font-konnect font-medium">Schritte</h2>
            </div>
            <ul className="flex flex-col gap-3 bg-slate-400 p-3 ">
                {renderStageSteps(sideMenuSteps)}
            </ul>
        </nav>
    );
}
