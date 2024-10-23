import React, { useState } from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Caption4, GridEntry, GridEntryCaption, GridEntryList, GridEntrySubGrid, showDataOrEmptySign } from './PlanSummary';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';
import ButtonLight from '../common/buttons/ButtongLight';
import {
    MdKeyboardDoubleArrowDown,
    MdKeyboardDoubleArrowUp,
} from 'react-icons/md';

interface Props {
    plan: IPlan;
    partnerProfileSnippets: { [Key: string]: BackendUserSnippet };
    openAllBoxes?: boolean;
    isSingleView?: boolean
}
export default function ViewAttributes({
    plan,
    partnerProfileSnippets,
    openAllBoxes,
    isSingleView
}: Props): JSX.Element {
    const { t } = useTranslation('common');

    const [isOpenStepSection, setIsOpenStepSection] = useState<boolean>(
        openAllBoxes ? true : false
    );

    return (
        <>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                {isSingleView !== true && (
                    <div className="font-bold text-xl col-span-4">{plan.name}</div>
                )}

                <div className="col-span-4 columns-2 gap-6">{plan.abstract}</div>

                {plan.partners.length > 0 && (
                    <div className="col-span-3 lg:col-span-2">
                        <GridEntryCaption>{t('plan_summary_partners')}</GridEntryCaption>
                        <ul className="ml-6 space-y-1">
                            {plan.partners.map((partner, index) => (
                                <li key={index}>
                                    {showDataOrEmptySign(
                                        partnerProfileSnippets[partner]
                                            ? partnerProfileSnippets[partner].first_name +
                                                  ' ' +
                                                  partnerProfileSnippets[partner].last_name
                                            : partner
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {plan.involved_parties.length > 0 && (
                    <div className="col-span-3 lg:col-span-2">
                        <GridEntryCaption>{t('plan_summary_externals')}</GridEntryCaption>
                        <ul className="ml-6  space-y-1">
                            {plan.involved_parties.map((party, index) => (
                                <li key={index}>{showDataOrEmptySign(party)}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {isOpenStepSection ? (
                    <>
                        {plan.institutions.length > 0 && (
                            <GridEntry caption={t('plan_summary_institutions')}>
                                <GridEntrySubGrid>
                                    {plan.institutions.map((institution, index) => (
                                        <ul className="space-y-1" key={index}>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_institutions_name')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.name)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_institutions_type')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.school_type)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_institutions_country')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.country)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_institutions_department')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(institution.department)}
                                                </div>
                                            </li>
                                        </ul>
                                    ))}
                                </GridEntrySubGrid>
                            </GridEntry>
                        )}

                        {plan.lectures.length > 0 && (
                            <GridEntry caption={t('plan_summary_lectures')}>
                                <GridEntrySubGrid>
                                    {plan.lectures.map((lecture, index) => (
                                        <ul className="space-y-1" key={index}>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_lectures_name')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(lecture.name)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>{`#${t(
                                                        'plan_summary_lectures_type'
                                                    )}`}</Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(lecture.lecture_type)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_lectures_format')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(lecture.lecture_format)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/2">
                                                    <Caption4>
                                                        {t('plan_summary_lectures_participants')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-1/2">
                                                    {showDataOrEmptySign(
                                                        lecture.participants_amount
                                                    )}
                                                </div>
                                            </li>
                                        </ul>
                                    ))}
                                </GridEntrySubGrid>
                            </GridEntry>
                        )}

                        <GridEntry caption={t('plan_summary_individual_learning_goals')}>
                            <GridEntrySubGrid>
                                {plan.individual_learning_goals.length !== 0 ? (
                                    plan.individual_learning_goals.map((goalPerPartner, index) => (
                                        <ul className="space-y-1" key={index}>
                                            <li className="flex">
                                                <div className="w-1/3 lg:w-1/4">
                                                    <Caption4>
                                                        {t(
                                                            'plan_summary_individual_learning_goals_name'
                                                        )}
                                                    </Caption4>
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
                                                <div className="w-1/3 lg:w-1/4">
                                                    <Caption4>
                                                        {t(
                                                            'plan_summary_individual_learning_goals_goals'
                                                        )}
                                                    </Caption4>
                                                </div>
                                                <div className="w-2/3 lg:w-3/4">
                                                    {showDataOrEmptySign(
                                                        goalPerPartner.learning_goal
                                                    )}
                                                </div>
                                            </li>
                                        </ul>
                                    ))
                                ) : (
                                    <li className="flex w-fit rounded-lg p-2">/</li>
                                )}
                            </GridEntrySubGrid>
                        </GridEntry>

                        {plan.major_learning_goals.length > 0 && (
                            <GridEntry caption={t('plan_summary_major_learning_goals')}>
                                <GridEntryList list={plan.major_learning_goals} />
                            </GridEntry>
                        )}

                        {plan.methodical_approaches.length > 0 && (
                            <GridEntry caption={t('plan_summary_methodics')}>
                                <GridEntryList list={plan.methodical_approaches} />
                            </GridEntry>
                        )}

                        {plan.target_groups.length > 0 && (
                            <GridEntry caption={t('plan_summary_target_groups')}>
                                <GridEntrySubGrid>
                                    {plan.target_groups.map((studyGroup, index) => (
                                        <ul className="space-y-1" key={index}>
                                            <li className="flex">
                                                <div className="w-1/3">
                                                    <Caption4>
                                                        {t('plan_summary_target_groups_name')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.name)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3">
                                                    <Caption4>
                                                        {t('plan_summary_target_groups_age')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.age_min)}
                                                    {' - '}
                                                    {showDataOrEmptySign(studyGroup.age_max)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3">
                                                    <Caption4>
                                                        {t('plan_summary_target_groups_experience')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.experience)}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3">
                                                    <Caption4>
                                                        {t(
                                                            'plan_summary_target_groups_academic_course'
                                                        )}
                                                    </Caption4>
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(
                                                        studyGroup.academic_course
                                                    )}
                                                </div>
                                            </li>
                                            <li className="flex">
                                                <div className="w-1/3">
                                                    <Caption4>
                                                        {t('plan_summary_target_groups_languages')}
                                                    </Caption4>
                                                </div>
                                                <div className="w-2/3">
                                                    {showDataOrEmptySign(studyGroup.languages.join(", "))}
                                                </div>
                                            </li>
                                        </ul>
                                    ))}
                                </GridEntrySubGrid>
                            </GridEntry>
                        )}

                        {plan.topics.length > 0 && (
                            <GridEntry caption={t('plan_summary_topics')}>
                                <GridEntryList list={plan.topics} />
                            </GridEntry>
                        )}

                        {plan.languages.length > 0 && (
                            <GridEntry caption={t('plan_summary_languages')}>
                                <GridEntryList list={plan.languages} />
                            </GridEntry>
                        )}

                        <GridEntry caption={t('plan_summary_formats')}>
                            {showDataOrEmptySign(plan.realization)}
                        </GridEntry>

                        <GridEntry caption={t('plan_summary_phys_mobility')}>
                            {showDataOrEmptySign(plan.physical_mobility ? t('yes') : t('no'))}
                        </GridEntry>

                        {plan.physical_mobilities.length > 0 && (
                            <GridEntry caption={t('plan_summary_phys_mobility_meets')}>
                                <div className="grid lg:grid-cols-2 gap-x-6 gap-y-4">
                                    {plan.physical_mobilities.map((mobility, index) => (
                                        <div key={index} className="">
                                            <ul className="space-y-1">
                                                <li className="flex">
                                                    <div className="w-1/3">
                                                        <Caption4>
                                                            {t(
                                                                'plan_summary_phys_mobility_location'
                                                            )}
                                                        </Caption4>
                                                    </div>
                                                    <div className="w-2/3">
                                                        {showDataOrEmptySign(mobility.location)}
                                                    </div>
                                                </li>
                                                <li className="flex">
                                                    <div className="w-1/3">
                                                        <Caption4>
                                                            {t('plan_summary_phys_mobility_date')}
                                                        </Caption4>
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
                                    ))}
                                </div>
                            </GridEntry>
                        )}

                        <GridEntry caption={t('plan_summary_learning_env')}>
                            {showDataOrEmptySign(plan.learning_env)}
                        </GridEntry>

                        {isSingleView !== true && (
                            <div className="col-span-4 flex justify-center">
                                <ButtonLight
                                    onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                    classNameExtend="!rounded-full !px-8 text-slate-800 print:hidden"
                                >
                                    {t('show_less')}
                                    <MdKeyboardDoubleArrowUp className="inline mx-2" />
                                </ButtonLight>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {isSingleView !== true && (
                            <div className="col-span-4 flex justify-center">
                                <ButtonLight
                                    onClick={() => setIsOpenStepSection(!isOpenStepSection)}
                                    classNameExtend="!rounded-full !px-8 text-slate-800 print:hidden"
                                >
                                    {t('show_all')}
                                    <MdKeyboardDoubleArrowDown className="inline mx-2" />
                                </ButtonLight>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
