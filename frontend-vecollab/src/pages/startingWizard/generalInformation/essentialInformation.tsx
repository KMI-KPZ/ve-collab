import React from 'react';
import { sideMenuStepsGeneralInformation } from '../../../frontendData/startingWizard/sideProgressBarData';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';

export default function EssentialInformation() {
    return (
        <main className="flex justify-between m-auto bg-pattern-left-blue-small bg-no-repeat">
            <form
                name="generalInformation"
                method="POST"
                /*onSubmit={handleSubmit}*/
                className="gap-y-6 m-auto p-12 max-w-screen-2xl items-center flex flex-col justify-between min-h-[50vh]"
            >
                <div>
                    <div className="m-7">
                        <label htmlFor="projectName" className="p-10">
                            Projektname
                        </label>
                        <input
                            type="text"
                            name="projectName"
                            /*onChange={handleChange}*/
                            id="projectName"
                            required={true}
                            className="border w-80 rounded-md h-12 p-2"
                        />
                    </div>
                    <div className="m-7">
                        <label htmlFor="partnerChoice" className="p-10">
                            Partnerwahl
                        </label>
                        <input
                            type="text"
                            name="partnerChoice"
                            /*onChange={handleChange}*/
                            id="partnerChoice"
                            required={true}
                            className="border w-80 rounded-md h-12 p-2"
                        />
                    </div>
                </div>
                <div className="flex gap-x-60">
                    <div>
                        <button
                            type="button"
                            className="items-end bg-kavaqOrange text-white py-4 pr-6 pl-5 m-7 rounded-lg"
                        >
                            Zurück
                        </button>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="items-end bg-kavaqOrange text-white py-4 pr-6 pl-5 m-7 rounded-lg"
                        >
                            Weiter
                        </button>
                    </div>
                </div>
            </form>
            <SideProgressBarSection sideMenuSteps={sideMenuStepsGeneralInformation} />
        </main>
    );
}
