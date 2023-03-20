import React from 'react';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';

export default function CourseInformation() {
    return (
        <main className="flex flex-col">
            <HeadProgressBarSection />
            <div className="flex justify-between">
                <div className="flex justify-around w-full">
                    <div>
                        <button
                            type="button"
                            className="items-end bg-ve-collab-orange text-white py-4 pr-6 pl-5 m-7 rounded-lg"
                        >
                            Zurück
                        </button>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="items-end bg-ve-collab-orange text-white py-4 pr-6 pl-5 m-7 rounded-lg"
                        >
                            Weiter
                        </button>
                    </div>
                </div>
                <SideProgressBarSection />
            </div>
        </main>
    );
}
