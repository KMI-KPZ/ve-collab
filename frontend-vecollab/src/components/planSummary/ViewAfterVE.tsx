import React, { useState } from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './planOverview';

interface Props {
    plan: IPlan;
}
export default function ViewAttributes({ plan }: Props): JSX.Element {
    const [isOpenShowMore, setIsOpenShowMore] = useState<boolean>(false);

    return (
        <>
            <div
                className="flex cursor-pointer justify-start items-center space-x-10 mb-4 ml-1"
                onClick={() => setIsOpenShowMore(!isOpenShowMore)}
            >
                <Image
                    src={iconDropdown}
                    alt="Dropdown arrow"
                    width={20}
                    height={20}
                    className={`${isOpenShowMore ? `rotate-180` : `rotate-0`}`}
                />
                <div className="text-2xl font-semibold">Good-Practice Dokumentation</div>
            </div>
            {isOpenShowMore ? (
                <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                    <span className="font-semibold pr-5">
                        Als Good-Practice Beispiel veröffentlicht
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {plan.is_good_practise ? 'Ja' : 'Nein'}
                        </li>
                    </ul>
                    <span className="text-base font-semibold pr-5">
                        zugrundeliegendes VE-Modell:
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.underlying_ve_model ? (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2 whitespace-pre-line">
                                {showDataOrEmptySign(plan.underlying_ve_model)}
                            </li>
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">Reflexion:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.reflection ? (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2 whitespace-pre-line">
                                {showDataOrEmptySign(plan.reflection)}
                            </li>
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">
                        Evaluation der Teilnehmenden:
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.good_practise_evaluation ? (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2 whitespace-pre-line">
                                {showDataOrEmptySign(plan.good_practise_evaluation)}
                            </li>
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                </section>
            ) : (
                <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                    <span className="font-semibold pr-5">
                        Als Good-Practice Beispiel veröffentlicht
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {plan.is_good_practise ? 'Ja' : 'Nein'}
                        </li>
                    </ul>
                    <span
                        onClick={() => setIsOpenShowMore(!isOpenShowMore)}
                        className="flex flex-col col-span-4  space-y-3 font-semibold pr-5 pt-4 cursor-pointer justify-center items-center"
                    >
                        mehr anzeigen...
                    </span>
                </section>
            )}
        </>
    );
}
