import React, { useState } from 'react';
import completedImage from '@/images/icons/progressBar/completed.svg';
import notStartedImage from '@/images/icons/progressBar/notStarted.svg';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
    ProgressState,
    SideMenuStep,
    ISideProgressBarStates,
} from '@/interfaces/ve-designer/sideProgressBar';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { SubmitHandler, useFormContext } from 'react-hook-form';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';

interface SideProgressBarSectionProps {
    progressState?: ISideProgressBarStates;
    onSubmit: SubmitHandler<any>;
}

export default function SideProgressBarWithReactHookForm({
    progressState,
    onSubmit,
}: SideProgressBarSectionProps): JSX.Element {
    const router = useRouter();
    const { handleSubmit } = useFormContext();
    const [popUp, setPopUp] = useState<{ isOpen: boolean; continueLink: string }>({
        isOpen: false,
        continueLink: '/plans',
    });

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
        if (
            progressState !== undefined &&
            progressState[idDecrypted as keyof ISideProgressBarStates] !== undefined
        ) {
            return progressState[idDecrypted as keyof ISideProgressBarStates];
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
                        onClick={handleSubmit(
                            async (data) => {
                                await onSubmit(data);
                                await router.push({
                                    pathname: sideMenuStep.link,
                                    query: {
                                        plannerId: router.query.plannerId,
                                    },
                                });
                            },
                            async () => setPopUp({ isOpen: true, continueLink: sideMenuStep.link })
                        )}
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
        <>
            <PopupSaveData
                isOpen={popUp.isOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: popUp.continueLink,
                        query: {
                            plannerId: router.query.plannerId,
                        },
                    });
                }}
                handleCancel={() => setPopUp({ isOpen: false, continueLink: '/plans' })}
            />
            <nav className="flex flex-col text-center w-80 shadow-inner mt-3 mb-3 bg-white rounded-xl">
                <div className="shadow-sm mb-3 rounded">
                    <h2 className="mt-5 mb-4 font-konnect font-medium">Schritte</h2>{' '}
                </div>
                <ul className="flex flex-col gap-1 bg-white p-3">
                    {renderStageSteps(sideMenuStepsData)}
                </ul>
            </nav>
        </>
    );
}
