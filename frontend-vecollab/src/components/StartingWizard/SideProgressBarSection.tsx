import React from 'react';
import completedImage from '@/images/icons/progressBar/completed.svg';
import notStartedImage from '@/images/icons/progressBar/notStarted.svg';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
    ProgressState,
    SideMenuStep,
    ISideProgressBarStates,
} from '@/interfaces/startingWizard/sideProgressBar';
import { useValidation } from '@/components/StartingWizard/ValidateRouteHook';

interface SideProgressBarSectionProps {
    progressState?: ISideProgressBarStates;
    handleValidation(): Promise<void>;
    isValid: boolean;
    sideMenuStepsData: SideMenuStep[];
}

export default function SideProgressBarSection({
    progressState,
    handleValidation,
    isValid,
    sideMenuStepsData,
}: SideProgressBarSectionProps): JSX.Element {
    const router = useRouter();
    const { validateAndRoute } = useValidation();

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

    const getProgressState = (id: string): any => {
        const idDecrypted: string = decodeURI(id);
        if (progressState !== undefined) {
            if (progressState[id as keyof ISideProgressBarStates] !== undefined) {
                return progressState[id as keyof ISideProgressBarStates];
            } else {
                const currentProgressStateObject = progressState.steps.find(
                    (step) => step[idDecrypted] !== undefined
                );
                if (currentProgressStateObject !== undefined) {
                    return currentProgressStateObject[idDecrypted];
                }
            }
        }
        return ProgressState.notStarted;
    };

    function renderStageSteps(sideMenuStepsData: SideMenuStep[]): JSX.Element[] {
        return sideMenuStepsData.map((sideMenuStep, index) => {
            const isCurrentPage = router.asPath.split('?')[0] == sideMenuStep.link;
            return (
                <li key={index}>
                    <button
                        type="button"
                        onClick={() => {
                            validateAndRoute(
                                sideMenuStep.link,
                                router.query.plannerId,
                                handleValidation,
                                isValid
                            );
                        }}
                        className={`flex bg-white p-2 w-full rounded-lg drop-shadow-lg`}
                    >
                        <Image
                            src={renderIcon(getProgressState(sideMenuStep.id))}
                            alt="Ve Collab Logo"
                        ></Image>
                        <p
                            className={`ml-3 font-konnect ${
                                isCurrentPage ? 'text-ve-collab-blue font-extrabold' : ''
                            }`}
                        >
                            {sideMenuStep.text}
                        </p>
                    </button>
                </li>
            );
        });
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
