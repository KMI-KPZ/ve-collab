import React, { useState } from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './PlanSummary';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';

interface Props {
    plan: IPlan;
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet };
    openAllBoxes?: boolean;
}
export default function ViewAttributes({
    plan,
    partnerProfileSnippets,
    openAllBoxes,
}: Props): JSX.Element {
    const { t } = useTranslation('common');

    const [isOpenStepSection, setIsOpenStepSection] = useState<boolean>(
        openAllBoxes ? true : false
    );
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
                <div className="text-2xl font-semibold">{t("plan_summary_characteristics")}</div>
            </div>

            <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                <span className="font-semibold pr-5">{t("plan_summary_name")}</span>
                <ul className="flex flex-col space-y-2 col-span-3">
                    <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                        {showDataOrEmptySign(plan.name)}
                    </li>
                </ul>
                <span className="font-semibold pr-5">{t("plan_summary_abstract")}</span>
                <ul className="flex flex-col space-y-2 col-span-3">
                    <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                        {showDataOrEmptySign(plan.abstract)}
                    </li>
                </ul>
                <span className="font-semibold pr-5">{t("plan_summary_partners")}</span>
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
                <span className="text-base font-semibold pr-5">{t("plan_summary_externals")}</span>
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
                {isOpenStepSection ? (
                    <>
                        <span className="font-semibold pr-5">{t("plan_summary_institutions")}</span>
                        <div className="grid xl:grid-cols-2 col-span-3">
                            {plan.institutions.length !== 0 ? (
                                plan.institutions.map((institution, index) => (
                                    <div
                                        key={index}
                                        className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                    >
                                        <ul className="space-y-1 mr-2">
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                {t("plan_summary_institutions_name")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.name)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                {t("plan_summary_institutions_type")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.school_type)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                    {t("plan_summary_institutions_country")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.country)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                    {t("plan_summary_institutions_department")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.department)}
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </div>
                        <span className="font-semibold pr-5 print:hidden">
                            {t("plan_summary_lectures")}
                        </span>
                        <span className="font-semibold pr-5 hidden print:block">
                            {t("plan_summary_lectures_print_line_break")}
                        </span>
                        <div className="grid xl:grid-cols-2 col-span-3">
                            {plan.lectures.length !== 0 ? (
                                plan.lectures.map((lecture, index) => (
                                    <div
                                        key={index}
                                        className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                    >
                                        <ul className="space-y-1 mr-2">
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                    {t("plan_summary_lectures_name")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(lecture.name)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">#
                                                    {t("plan_summary_lectures_type")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(lecture.lecture_type)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                    {t("plan_summary_lectures_format")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(lecture.lecture_format)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2 font-medium print:font-bold">
                                                    {t("plan_summary_lectures_participants")}
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(
                                                        lecture.participants_amount
                                                    )}
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </div>
                        <span className="font-semibold pr-5">{t("plan_summary_individual_learning_goals")}</span>
                        <div className="grid col-span-3">
                            {plan.individual_learning_goals.length !== 0 ? (
                                plan.individual_learning_goals.map((goalPerPartner, index) => (
                                    <div
                                        key={index}
                                        className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                    >
                                        <ul className="space-y-1 mr-2">
                                            <li className="flex">
                                                <div className="w-1/3 lg:w-1/4 font-medium print:font-bold">
                                                    {t("plan_summary_individual_learning_goals_name")}
                                                </div>
                                                <div className="w-2/3 lg:w-3/4">
                                                    {showDataOrEmptySign(
                                                        partnerProfileSnippets[
                                                            goalPerPartner.username
                                                        ]
                                                            ? partnerProfileSnippets[
                                                                  goalPerPartner.username
                                                              ].first_name +
                                                                  ' ' +
                                                                  partnerProfileSnippets[
                                                                      goalPerPartner.username
                                                                  ].last_name
                                                            : goalPerPartner.username
                                                    )}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3 lg:w-1/4 font-medium print:font-bold">
                                                    {t("plan_summary_individual_learning_goals_goals")}
                                                </div>
                                                <div className="w-2/3 lg:w-3/4">
                                                    {showDataOrEmptySign(
                                                        goalPerPartner.learning_goal
                                                    )}
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </div>
                        <span className="font-semibold pr-5">{t("plan_summary_major_learning_goals")}</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            {plan.major_learning_goals.length !== 0 ? (
                                plan.major_learning_goals.map((goal, index) => (
                                    <li
                                        className="flex w-fit bg-slate-200 rounded-lg p-2"
                                        key={index}
                                    >
                                        {showDataOrEmptySign(goal)}
                                    </li>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </ul>
                        <span className="font-semibold pr-5">{t("plan_summary_methodics")}</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            {plan.methodical_approaches.length !== 0 ? (
                                plan.methodical_approaches.map((approach, index) => (
                                    <li
                                        className="flex w-fit bg-slate-200 rounded-lg p-2"
                                        key={index}
                                    >
                                        {showDataOrEmptySign(approach)}
                                    </li>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </ul>
                        <span className="font-semibold pr-5">{t("plan_summary_target_groups")}</span>
                        <div className="grid xl:grid-cols-2 col-span-3">
                            {plan.target_groups.length !== 0 ? (
                                plan.target_groups.map((studyGroup, index) => (
                                    <div
                                        key={index}
                                        className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                    >
                                        <ul className="space-y-1 mr-2">
                                            <li className="flex">
                                                <div className="w-1/3 font-medium print:font-bold">
                                                    {t("plan_summary_target_groups_name")}
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.name)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3 font-medium print:font-bold">
                                                    {t("plan_summary_target_groups_age")}
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.age_min)}
                                                    {' - '}
                                                    {showDataOrEmptySign(studyGroup.age_max)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3 font-medium print:font-bold">
                                                    {t("plan_summary_target_groups_experience")}
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.experience)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3 font-medium print:font-bold">
                                                    {t("plan_summary_target_groups_academic_course")}
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(
                                                        studyGroup.academic_course
                                                    )}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3 font-medium print:font-bold">
                                                    {t("plan_summary_target_groups_languages")}
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.languages)}
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </div>
                        <span className="font-semibold pr-5">{t("plan_summary_topics")}</span>
                        <ul className="flex flex-col space-y-2  col-span-3">
                            {plan.topics.length !== 0 ? (
                                plan.topics.map((topic, index) => (
                                    <li
                                        className="flex w-fit bg-slate-200 rounded-lg p-2"
                                        key={index}
                                    >
                                        {showDataOrEmptySign(topic)}
                                    </li>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </ul>
                        <span className="font-semibold pr-5">{t("plan_summary_languages")}</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            {plan.languages.length !== 0 ? (
                                plan.languages.map((language, index) => (
                                    <li
                                        className="flex w-fit bg-slate-200 rounded-lg p-2"
                                        key={index}
                                    >
                                        {showDataOrEmptySign(language)}
                                    </li>
                                ))
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </ul>
                        <span className="font-semibold pr-5">{t("plan_summary_formats")}</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                {showDataOrEmptySign(plan.realization)}
                            </li>
                        </ul>
                        <span className="font-semibold pr-5">{t("plan_summary_phys_mobility")}</span>
                        <ul className="flex flex-col space-y-2 col-span-3">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                {showDataOrEmptySign(plan.physical_mobility ? t("yes") : t("no"))}
                            </li>
                        </ul>
                        {plan.physical_mobility && plan.physical_mobilities.length > 0 && (
                            <>
                                <span className="font-semibold pr-5">{t("plan_summary_phys_mobility_meets")}</span>
                                <div className="grid lg:grid-cols-2 col-span-3">
                                    {plan.physical_mobilities.length !== 0 ? (
                                        plan.physical_mobilities.map((mobility, index) => (
                                            <div
                                                key={index}
                                                className="p-5 mr-3 mb-3 bg-slate-200 rounded-lg space-x-2"
                                            >
                                                <ul className="space-y-1 mr-2">
                                                    <li className="flex">
                                                        <div className="w-1/3 font-medium print:font-bold">
                                                            {t("plan_summary_phys_mobility_location")}
                                                        </div>
                                                        <div className="w-2/3">
                                                            {showDataOrEmptySign(mobility.location)}
                                                        </div>
                                                    </li>
                                                    <li className="flex">
                                                        <div className="w-1/3 font-medium print:font-bold">
                                                            {t("plan_summary_phys_mobility_date")}
                                                        </div>
                                                        <div className="w-2/3">
                                                            {showDataOrEmptySign(
                                                                mobility.timestamp_from
                                                                    ? mobility.timestamp_from.split(
                                                                          'T'
                                                                      )[0]
                                                                    : ''
                                                            )}
                                                            {' - '}
                                                            {showDataOrEmptySign(
                                                                mobility.timestamp_to
                                                                    ? mobility.timestamp_to.split(
                                                                          'T'
                                                                      )[0]
                                                                    : ''
                                                            )}
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        ))
                                    ) : (
                                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                                            /
                                        </li>
                                    )}
                                </div>
                            </>
                        )}
                        <span className="font-semibold pr-5">{t("plan_summary_learning_env")}</span>
                        <ul className="flex flex-col col-span-3 space-y-2 ">
                            <li className="flex w-fit bg-slate-200 rounded-lg p-5">
                                {showDataOrEmptySign(plan.learning_env)}
                            </li>
                        </ul>
                    </>
                ) : (
                    <span
                        onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                        className="flex flex-col col-span-4  space-y-3 font-semibold pr-5 pt-4 cursor-pointer justify-center items-center"
                    >
                        {t("plan_summary_show_more")}
                    </span>
                )}
            </section>
        </>
    );
}
