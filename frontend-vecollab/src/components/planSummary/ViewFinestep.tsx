import React, { useState } from 'react';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './planOverview';

interface Props {
    fineStep: IFineStep;
}

export default function ViewFinestep({ fineStep }: Props): JSX.Element {
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
                </div>
            </div>
            {isOpenStepSection && (
                <section>
                    <hr className="h-px my-5 bg-gray-400 border-0" />
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-center">
                            <p className="font-semibold px-2 py-2">Zeitumfang:</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.workload) + ' Stunden'}
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-center">
                            <p className="font-semibold px-2 py-2">Lernziel(e):</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.learning_goal)}
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-center">
                            <p className="font-semibold px-2 py-2">Lernaktivität(en):</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.learning_activity)}
                        </div>
                    </div>
                    <div className="mt-4 flex">
                        <div className="w-1/6 flex items-center">
                            <p className="font-semibold px-2 py-2">Lernaktivitäten detailert ausgearbeitet:</p>
                        </div>
                        <div className="flex items-center w-fit bg-slate-200 rounded-lg px-3">
                            {showDataOrEmptySign(fineStep.has_tasks ? 'Ja' : 'Nein')}
                        </div>
                    </div>
                    {fineStep.has_tasks && (
                        <div className="mt-4 flex">
                            <div className="font-semibold w-1/5 flex items-center px-2 py-2px-2 py-2">
                                Aufgabenstellungen:
                            </div>
                            {fineStep.tasks.map((task, taskIndex) => (
                                <div
                                    className="flex flex-col space-y-1 w-1/2 p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl"
                                    key={taskIndex}
                                >
                                    <div className="flex space-x-8">
                                        <span className="w-1/4 font-medium">Aufgabenstellung</span>
                                        <span>{showDataOrEmptySign(task.task_formulation)}</span>
                                    </div>
                                    <div className="flex space-x-8">
                                        <span className="w-1/4 font-medium">Arbeitsform</span>
                                        <span>{showDataOrEmptySign(task.work_mode)}</span>
                                    </div>
                                    <div className="flex space-x-8">
                                        <span className="w-1/4 font-medium">Notizen</span>
                                        <span>{showDataOrEmptySign(task.notes)}</span>
                                    </div>
                                    <div className="flex space-x-8">
                                        <span className="w-1/4 font-medium">Tools</span>
                                        <span>
                                            {showDataOrEmptySign(
                                                task.tools
                                                    .filter((element) => element !== '')
                                                    .join(', ')
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex space-x-8">
                                        <span className="w-1/4 font-medium">Materialien</span>
                                        <span>
                                            {showDataOrEmptySign(
                                                task.materials
                                                    .filter((element) => element !== '')
                                                    .join(', ')
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
