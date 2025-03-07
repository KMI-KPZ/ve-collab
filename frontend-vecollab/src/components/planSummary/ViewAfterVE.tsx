import React, { useState } from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { GridEntry, GridEntry2Col, showDataOrEmptySign } from './PlanSummary';
import { AuthenticatedFile } from '../common/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { MdKeyboardDoubleArrowDown, MdKeyboardDoubleArrowUp } from 'react-icons/md';
import ButtonLight from '../common/buttons/ButtongLight';

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
    isSingleView?: boolean;
}
export default function ViewAttributes({ plan, openAllBoxes, isSingleView }: Props): JSX.Element {
    const { t } = useTranslation('common');

    const [isOpenShowMore, setIsOpenShowMore] = useState<boolean>(openAllBoxes ? true : false);

    return (
        <>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                <div className="col-span-4 mb-4 text-2xl font-semibold underline decoration-ve-collab-blue decoration-4 underline-offset-6">
                    {t('plan_summary_gpb_documentation')}
                </div>

                {isOpenShowMore ? (
                    <>
                        <GridEntry2Col
                            col1={{
                                caption: t('plan_summary_is_good_practise'),
                                value: plan.is_good_practise ? t('yes') : t('no'),
                            }}
                            col2={{
                                caption: t('plan_summary_underlying_ve_model'),
                                value: showDataOrEmptySign(plan.underlying_ve_model),
                            }}
                        />

                        <GridEntry2Col
                            col1={{
                                caption: t('plan_summary_reflection'),
                                value: showDataOrEmptySign(plan.reflection),
                            }}
                            col2={{
                                caption: t('plan_summary_reflection_file'),
                                value: (
                                    <>
                                        {plan.evaluation_file ? (
                                            <AuthenticatedFile
                                                url={`/uploads/${plan.evaluation_file.file_id}`}
                                                filename={plan.evaluation_file.file_name}
                                            >
                                                <div className="flex justify-center">
                                                    <RxFile size={40} />
                                                </div>
                                                <div className="justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                                    {plan.evaluation_file.file_name}
                                                </div>
                                            </AuthenticatedFile>
                                        ) : (
                                            <span>/</span>
                                        )}
                                    </>
                                ),
                            }}
                        />

                        <GridEntry2Col
                            col1={{
                                caption: t('plan_summary_literature'),
                                value: showDataOrEmptySign(plan.literature),
                            }}
                            col2={{
                                caption: t('plan_summary_literature_files'),
                                value: (
                                    <div className="my-4 max-w-96">
                                        {plan.literature_files && plan.literature_files.length ? (
                                            <>
                                                {plan.literature_files.map((file, index) => {
                                                    return (
                                                        <AuthenticatedFile
                                                            key={index}
                                                            url={`/uploads/${file.file_id}`}
                                                            filename={file.file_name}
                                                        >
                                                            <div className="flex justify-center">
                                                                <RxFile size={40} />
                                                            </div>
                                                            <div className="max-w-96 justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                                                {file.file_name}
                                                            </div>
                                                        </AuthenticatedFile>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <span>/</span>
                                        )}
                                    </div>
                                ),
                            }}
                        />

                        {isSingleView !== true && (
                            <div className="col-span-4 flex justify-center">
                                <ButtonLight
                                    onClick={() => setIsOpenShowMore(!isOpenShowMore)}
                                    className="rounded-full! px-8! text-slate-800 print:hidden"
                                >
                                    {t('show_less')}
                                    <MdKeyboardDoubleArrowUp className="inline ml-2" />
                                </ButtonLight>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <GridEntry caption={t('plan_summary_is_good_practise')}>
                            {plan.is_good_practise ? t('yes') : t('no')}
                        </GridEntry>

                        {isSingleView !== true && (
                            <div className="col-span-4 flex justify-center">
                                <ButtonLight
                                    onClick={() => setIsOpenShowMore(!isOpenShowMore)}
                                    className="rounded-full! px-8! text-slate-800 print:hidden"
                                >
                                    {t('show_all')}
                                    <MdKeyboardDoubleArrowDown className="inline ml-2" />
                                </ButtonLight>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
