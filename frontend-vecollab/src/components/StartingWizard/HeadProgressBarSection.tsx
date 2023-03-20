import React from 'react';

export default function HeadProgressBarSection() {
    interface HeadMenuProgressStep {
        description: string;
    }

    const headMenuProgressStep: HeadMenuProgressStep[] = [
        {
            description: 'Essentielle Informationen',
        },
        {
            description: 'Kursinformationen',
        },
        {
            description: 'Kursinformationen',
        },
        {
            description: 'Kursinformationen',
        },
    ];

    function renderHeadProgressBar(
        headMenuStepsGeneralInformation: HeadMenuProgressStep[]
    ): JSX.Element[] {
        return headMenuStepsGeneralInformation.map((step, index) => (
            <div key={index}>
                <div className="flex align-middle items-center">
                    <div className="flex-grow-0 shadow w-10 h-10 border-4 border-ve-collab-blue rounded-full text-lg flex items-center justify-center">
                        <span className="text-center text-ve-collab-blue">{index + 1}</span>
                    </div>
                    {headMenuStepsGeneralInformation.length != index + 1 && (
                        <div className="relative">
                            <div className="flex-grow w-40 border-2 border-gray-400 top-0 left-0 "></div>
                            <div className="absolute flex-grow w-20 border-2 border-ve-collab-blue top-0 left-0 "></div>
                        </div>
                    )}
                </div>
            </div>
        ));
    }

    return (
        <nav className="flex w-full justify-center py-6">
            {renderHeadProgressBar(headMenuProgressStep)}
        </nav>
    );
}
