import React, { useState } from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './planOverview';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';

interface Props {
    plan: IPlan;
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet };
}
export default function ViewAttributes({ plan, partnerProfileSnippets }: Props): JSX.Element {
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
                                    {showDataOrEmptySign(
                                        partnerProfileSnippets[partner]
                                            ? partnerProfileSnippets[partner].first_name +
                                                  ' ' +
                                                  partnerProfileSnippets[partner].last_name
                                            : partner
                                    )}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">Externe Beteiligte:</span>
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
                                        <li className="font-medium">Name</li>
                                        <li className="font-medium">Bildungseinrichtung</li>
                                        <li className="font-medium">Land</li>
                                        <li className="font-medium">Fachbereich</li>
                                    </ul>
                                    <ul className="space-y-1">
                                        <li>{showDataOrEmptySign(institution.name)}</li>
                                        <li>{showDataOrEmptySign(institution.school_type)}</li>
                                        <li>{showDataOrEmptySign(institution.country)}</li>
                                        <li>{showDataOrEmptySign(institution.departments)}</li>
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
                                        <li className="font-medium">Name</li>
                                        <li className="font-medium">Typ</li>
                                        <li className="font-medium">Format</li>
                                        <li className="font-medium">Teilnehmendenzahl</li>
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
                    <span className="font-semibold pr-5">Lernziele (individuell):</span>
                    <div className="grid grid-cols-2 col-span-3">
                        {plan.individual_learning_goals.length !== 0 ? (
                            plan.individual_learning_goals.map((goalPerPartner, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                >
                                    <ul className="space-y-1 mr-2">
                                        <li className="font-medium">Name</li>
                                        <li className="font-medium">Lernziel</li>
                                    </ul>
                                    <ul className="space-y-1">
                                        <li>
                                            {showDataOrEmptySign(
                                                partnerProfileSnippets[goalPerPartner.username]
                                                    ? partnerProfileSnippets[
                                                          goalPerPartner.username
                                                      ].first_name +
                                                          ' ' +
                                                          partnerProfileSnippets[
                                                              goalPerPartner.username
                                                          ].last_name
                                                    : goalPerPartner.username
                                            )}{' '}
                                        </li>
                                        <li>{showDataOrEmptySign(goalPerPartner.learning_goal)}</li>
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </div>
                    <span className="font-semibold pr-5">Lernziele (übergeordnet):</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.major_learning_goals.length !== 0 ? (
                            plan.major_learning_goals.map((goal, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(goal)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="font-semibold pr-5">Methodischer Ansatz</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {showDataOrEmptySign(plan.methodical_approach)}
                        </li>
                    </ul>
                    <span className="font-semibold pr-5">Zielgruppen:</span>
                    <div className="grid grid-cols-2 space-y-2 col-span-3">
                        {plan.audience.length !== 0 ? (
                            plan.audience.map((studyGroup, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                >
                                    <ul className="space-y-1 mr-2">
                                        <li className="font-medium">Name</li>
                                        <li className="font-medium">Alter</li>
                                        <li className="font-medium">VE-Erfahrung</li>
                                        <li className="font-medium">Studiengang</li>
                                        <li className="font-medium">Erstsprache</li>
                                        <li className="font-medium">weitere Sprachen</li>
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
                    <span className="font-semibold pr-5">Thema / Themen:</span>
                    <ul className="flex flex-col space-y-2  col-span-3">
                        {plan.topics.length !== 0 ? (
                            plan.topics.map((topic, index) => (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2" key={index}>
                                    {showDataOrEmptySign(topic)}
                                </li>
                            ))
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="font-semibold pr-5">Sprache(n):</span>
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
                    <span className="font-semibold pr-5">(Digitale) Formate:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {showDataOrEmptySign(plan.realization)}
                        </li>
                    </ul>
                    <span className="font-semibold pr-5">begleitende physische Mobilität:</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {showDataOrEmptySign(plan.physical_mobility ? 'Ja' : 'Nein')}
                        </li>
                    </ul>
                    {plan.physical_mobility && plan.physical_mobilities.length > 0 && (
                        <>
                            <span className="font-semibold pr-5">geplante Treffen:</span>
                            <div className="grid grid-cols-2 space-y-2 col-span-3">
                                {plan.physical_mobilities.length !== 0 ? (
                                    plan.physical_mobilities.map((mobility, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-2 p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                        >
                                            <ul className="space-y-1 mr-2">
                                                <li className="font-medium">Ort</li>
                                                <li className="font-medium">Datum</li>
                                            </ul>
                                            <ul className="space-y-1">
                                                <li>{showDataOrEmptySign(mobility.location)} </li>
                                                <li>
                                                    {showDataOrEmptySign(
                                                        mobility.timestamp_from
                                                            ? mobility.timestamp_from.split('T')[0]
                                                            : ''
                                                    )}
                                                    {' - '}
                                                    {showDataOrEmptySign(
                                                        mobility.timestamp_to
                                                            ? mobility.timestamp_to.split('T')[0]
                                                            : ''
                                                    )}
                                                </li>
                                            </ul>
                                        </div>
                                    ))
                                ) : (
                                    <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                                )}
                            </div>
                        </>
                    )}
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
