import React, { useState } from 'react';
import { showDataOrEmptySign } from '@/pages/planSummary/[planSummarySlug]';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';

interface Props {
    plan: IPlan;
}
export default function ViewAttributes({ plan }: Props): JSX.Element {
    const [isOpenStepSection, setIsOpenStepSection] = useState<boolean>(false);
    return (
        <>
            <div
                className="flex cursor-pointer justify-start items-center space-x-10 mb-4 ml-1"
                onClick={() => setIsOpenStepSection(!isOpenStepSection)}
            >
                <Image
                    src={iconDropdown}
                    alt="Dropdown arrow"
                    width={20}
                    height={20}
                    className={`${isOpenStepSection ? `rotate-180` : `rotate-0`}`}
                />
                <div className="text-2xl font-semibold">Eigenschaften</div>
            </div>
            {isOpenStepSection ? (
                <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                    <span className="font-semibold pr-5">Partners:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.partners.length !== 0 ? (
                            plan.partners.map((partner, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(partner)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">Externe Beteidigte:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.involved_parties.length !== 0 ? (
                            plan.involved_parties.map((party, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(party)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="font-semibold pr-5">Institutionen:</span>
                    <div className="grid grid-cols-2 col-span-3">
                        {plan.institutions.length !== 0 ? (
                            plan.institutions.map((institution, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                >
                                    <ul className="space-y-1 mr-2">
                                        <li className="font-medium"> Name </li>
                                        <li className="font-medium"> Schulform </li>
                                        <li className="font-medium"> Land </li>
                                        <li className="font-medium">Abteilungsname</li>
                                        <li className="font-medium">Beteidigte Studiengänge</li>
                                    </ul>
                                    <ul className="space-y-1">
                                        <li>{showDataOrEmptySign(institution.name)}</li>
                                        <li>{showDataOrEmptySign(institution.school_type)}</li>
                                        <li>{showDataOrEmptySign(institution.country)}</li>
                                        <li>{showDataOrEmptySign(institution.departments)}</li>
                                        <li>{showDataOrEmptySign(institution.academic_courses)}</li>
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </div>
                    <span className="font-semibold pr-5">Lehrveranstaltungen:</span>
                    <div className="grid grid-cols-2 col-span-3">
                        {plan.lectures.length !== 0 ? (
                            plan.lectures.map((lecture, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                >
                                    <ul className="space-y-1 mr-2">
                                        <li className="font-medium"> Name </li>
                                        <li className="font-medium"> Typ </li>
                                        <li className="font-medium"> Format </li>
                                        <li className="font-medium">Teilnehmerzahl</li>
                                    </ul>
                                    <ul className="space-y-1">
                                        <li>{showDataOrEmptySign(lecture.name)} </li>
                                        <li>{showDataOrEmptySign(lecture.lecture_type)}</li>
                                        <li>{showDataOrEmptySign(lecture.lecture_format)}</li>
                                        <li>{showDataOrEmptySign(lecture.participants_amount)}</li>
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </div>
                    <span className="font-semibold pr-5">Zielgruppen:</span>
                    <div className="grid grid-cols-2 space-y-2 col-span-3">
                        {plan.audience.length !== 0 ? (
                            plan.audience.map((studyGroup, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                >
                                    <ul className="space-y-1 mr-2">
                                        <li className="font-medium"> Name </li>
                                        <li className="font-medium"> Alter </li>
                                        <li className="font-medium"> Erfahrung </li>
                                        <li className="font-medium">Studiengang</li>
                                        <li className="font-medium">Muttersprache</li>
                                        <li className="font-medium">Fremdsprachen</li>
                                        <li className="font-medium">Lernziele</li>
                                    </ul>
                                    <ul className="space-y-1">
                                        <li>{showDataOrEmptySign(studyGroup.name)} </li>
                                        <li>
                                            {showDataOrEmptySign(studyGroup.age_min)}
                                            {' - '}
                                            {showDataOrEmptySign(studyGroup.age_max)}
                                        </li>
                                        <li>{showDataOrEmptySign(studyGroup.experience)}</li>
                                        <li>{showDataOrEmptySign(studyGroup.academic_course)}</li>
                                        <li>{showDataOrEmptySign(studyGroup.mother_tongue)}</li>
                                        <li>{showDataOrEmptySign(studyGroup.foreign_languages)}</li>
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </div>
                    <span className="font-semibold pr-5">Thema:</span>
                    <ul className="flex flex-col space-y-2  col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {showDataOrEmptySign(plan.topic)}
                        </li>
                    </ul>
                    <span className="font-semibold pr-5">Sprachen:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.languages.length !== 0 ? (
                            plan.languages.map((language, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(language)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="font-semibold pr-5">Neue Inhalte:</span>
                    <ul className="flex flex-col space-y-2  col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {plan.new_content ? (plan.new_content ? 'Ja' : 'Nein') : '/'}
                        </li>
                    </ul>
                    <span className="font-semibold pr-5">Digitale Umsetzung:</span>
                    <ul className="flex flex-col col-span-3 space-y-2 ">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {showDataOrEmptySign(plan.realization)}
                        </li>
                    </ul>
                    <span className="font-semibold pr-5">Digitale Lernumgebung:</span>
                    <ul className="flex flex-col col-span-3 space-y-2 ">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {showDataOrEmptySign(plan.learning_env)}
                        </li>
                    </ul>
                </section>
            ) : (
                <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                    <span className="font-semibold pr-5">Partners:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.partners.length !== 0 ? (
                            plan.partners.map((partner, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(partner)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">Externe Beteidigte:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.involved_parties.length !== 0 ? (
                            plan.involved_parties.map((party, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(party)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span
                        onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                        className="flex flex-col col-span-4  space-y-3 font-semibold pr-5 pt-4 cursor-pointer justify-center items-center"
                    >
                        mehr anzeigen...
                    </span>
                </section>
            )}
        </>
    );
}
