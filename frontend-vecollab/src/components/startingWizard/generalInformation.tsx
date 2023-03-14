import React from 'react';

export default function GeneralInformation() {
    return (
        <div className="flex flex-col p-12 max-w-screen-2xl m-auto bg-pattern-left-blue-small bg-no-repeat">
            <form
                name="generalInformation"
                method="POST"
                /*onSubmit={handleSubmit}*/
                className="gap-y-6 m-auto p-12 max-w-screen-2xl items-center"
            >
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
                <div>
                    <button
                        type="button"
                        className="items-end bg-ve-collab-orange text-white py-4 pr-6 pl-5 m-7 rounded-lg"
                    >
                        Weiter
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
            </form>
        </div>
    );
}
