import React, { useState } from 'react';
import { IFineStep } from '@/pages/ve-designer/step-data/[stepName]';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './PlanSummary';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import Link from 'next/link';
import { MdArrowOutward } from 'react-icons/md';

interface Props {
    fineStep: IFineStep;
    openAllBoxes?: boolean;
    handleImportStep?: (step: IFineStep) => void
    availablePlans: IPlan[]
}

export default function ViewFinestep({ fineStep, openAllBoxes, availablePlans, handleImportStep }: Props): JSX.Element {

    const originalPlan = availablePlans.find(a => a._id == fineStep.original_plan)

    const convertDateToLocal = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const [isOpenStepSection, setIsOpenStepSection] = useState<boolean>(
        openAllBoxes ? true : false
    );

    return (
        <div className="border-2 border-gray-400 rounded-3xl p-4 mb-4">
            <div
                className="flex flex-wrap cursor-pointer justify-start items-center space-x-10"
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

                {typeof handleImportStep !== 'undefined' && (
                    <div>
                        <button
                            className="px-4 py-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20 print:hidden"
                            type='button'
                            title='Diese Etappe in eigenen Plan übernehmen'
                            onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleImportStep(fineStep)
                            }}
                        >
                            Exportieren
                        </button>
                    </div>
                )}
            </div>
            {isOpenStepSection && (
                <>
                    <hr className="h-px my-5 bg-gray-400 border-0" />
                    <section className="grid grid-cols-4 gap-8">
                        <span className="text-base font-semibold pr-5">Zeitumfang:</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                {showDataOrEmptySign(fineStep.workload) + ' Stunden'}
                            </li>
                        </ul>
                        <span className="text-base font-semibold pr-5">Lernziele:</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                {showDataOrEmptySign(fineStep.learning_goal)}
                            </li>
                        </ul>
                        <span className="text-base font-semibold pr-5">Lernaktivität(en):</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                {showDataOrEmptySign(fineStep.learning_activity)}
                            </li>
                        </ul>
                        <span className="text-base font-semibold pr-5">
                            Lernaktivitäten detailiert ausgearbeitet:
                        </span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                {showDataOrEmptySign(fineStep.has_tasks ? 'Ja' : 'Nein')}
                            </li>
                        </ul>
                        {fineStep.has_tasks && (
                            <>
                                <span className="font-semibold pr-5 print:hidden">Aufgabenstellungen:</span>
                                <span className='font-semibold pr-5 hidden print:block'>Aufgaben-stellungen:</span>
                                <div className="grid col-span-3">
                                    {fineStep.tasks.map((task, taskIndex) => (
                                        <div
                                            key={taskIndex}
                                            className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                        >
                                            <ul className="space-y-1 mr-2">
                                                <li className="flex">
                                                    <div className="w-1/2 lg:w-1/3 xl:w-1/4 font-medium print:font-bold">
                                                        Aufagabenstellung
                                                    </div>
                                                    <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                        {showDataOrEmptySign(task.task_formulation)}
                                                    </div>
                                                </li>
                                                <li className="flex">
                                                    <div className="w-1/2 lg:w-1/3 xl:w-1/4 font-medium print:font-bold">
                                                        Arbeitsform
                                                    </div>
                                                    <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                        {showDataOrEmptySign(task.work_mode)}
                                                    </div>
                                                </li>
                                                <li className="flex">
                                                    <div className="w-1/2 lg:w-1/3 xl:w-1/4 font-medium print:font-bold">
                                                        Notizen
                                                    </div>
                                                    <div className="w-1/2 lg:w-2/3 xl:w-3/4">
                                                        {showDataOrEmptySign(task.notes)}
                                                    </div>
                                                </li>
                                                <li className="flex">
                                                    <div className="w-1/2 lg:w-1/3 xl:w-1/4 font-medium print:font-bold">
                                                        Tools
                                                    </div>
                                                    <div className="w-1/2 lg:w-2/3 xl:w-3/4">
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
                            </>
                        )}

                        {fineStep.original_plan !== '' && (
                            <>
                                <span className="text-base font-semibold pr-5">Etappe importiert aus:</span>


                                <ul className="flex flex-col space-y-2 col-span-3">
                                    <li className="flex items-center w-fit bg-slate-200 rounded-lg p-2">
                                        {typeof originalPlan !== 'undefined'
                                            ? (
                                                <Link href={`/plan/${originalPlan?._id}`} target='_blank'>
                                                    {originalPlan?.name}
                                                    <MdArrowOutward className='inline' />
                                                </Link>)
                                            : (<>Plan nicht mehr vorhanden</>)}
                                    </li>
                                </ul>
                                <span className="text-base font-semibold pr-5">Autor des original Plans:</span>
                                <ul className="flex flex-col space-y-2 col-span-3">
                                    <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                        {showDataOrEmptySign(originalPlan?.author)}
                                    </li>
                                </ul>
                            </>
                        )}

                    </section>
                </>
            )}
        </div>
    );
}
