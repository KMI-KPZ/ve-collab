import React, { useState } from 'react';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './planOverview';

interface Props {
    fineStep: IFineStep;
    handleImportStep: (step: IFineStep) => void
}

export default function ViewFinestep({ fineStep, handleImportStep }: Props): JSX.Element {
    const convertDateToLocal = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const [isOpenStepSection, setIsOpenStepSection] = useState<boolean>(false);

    return (
        <div className="p-4 my-8 bg-white border-2 border-gray-400 rounded-3xl">
            <div
                className="flex justify-start items-center space-x-10 cursor-pointer"
                onClick={() => setIsOpenStepSection(!isOpenStepSection)}
            >
                <Image
                    src={iconDropdown}
                    alt="Dropdown arrow"
                    width={20}
                    height={20}
                    className={`${isOpenStepSection ? `rotate-180` : `rotate-0`}`}
                />
                <div className="flex">
                    <div className="font-bold text-xl mx-2">Etappe:</div>
                    <div className="font-bold text-xl">{showDataOrEmptySign(fineStep.name)}</div>
                </div>
                <div className="flex">
                    <div className="font-bold mx-2">Zeitspanne:</div>
                    <div className="mx-2">
                        {showDataOrEmptySign(convertDateToLocal(fineStep.timestamp_from))}
                        {' - '}
                        {showDataOrEmptySign(convertDateToLocal(fineStep.timestamp_to))}
                    </div>
                    <div>
                    <button
                        className="px-4 m-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                        type='button'
                        title='Etappe importieren'
                        onClick={e => handleImportStep(fineStep)}
                    >
                        Import
                    </button>
                    </div>
                </div>
            </div>
            {isOpenStepSection && (
                <section>
                    <hr className="h-px my-5 bg-gray-400 border-0" />
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-start">
                            <p className="font-semibold px-2 py-2">Zeitumfang:</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.workload) + ' Stunden'}
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-start">
                            <p className="font-semibold px-2 py-2">Lernziel(e):</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.learning_goal)}
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-start">
                            <p className="font-semibold px-2 py-2">Lernaktivität(en):</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.learning_activity)}
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-start">
                            <p className="font-semibold px-2 py-2">
                                Lernaktivitäten detailert ausgearbeitet:
                            </p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.has_tasks ? 'Ja' : 'Nein')}
                        </div>
                    </div>
                    {fineStep.has_tasks && (
                        <div className="mt-4 flex">
                            <div className="font-semibold w-1/6 flex items-start px-2 py-2">
                                Aufgabenstellungen:
                            </div>
                            <div className="grid grid-cols-2 col-span-3">
                                {fineStep.tasks.map((task, taskIndex) => (
                                    <div
                                        className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                        key={taskIndex}
                                    >
                                        <ul className="space-y-1 mr-2">
                                            <li className="flex">
                                                <div className="w-1/2 font-medium">
                                                    Aufgabenstellung
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(task.task_formulation)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium">Arbeitsform</div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(task.work_mode)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium">Notizen</div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(task.notes)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium">Tools</div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(
                                                        task.tools
                                                            .filter((element) => element !== '')
                                                            .join(', ')
                                                    )}
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
