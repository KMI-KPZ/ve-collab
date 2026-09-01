import React from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Field } from './PlanSummary';
import { AuthenticatedFile } from '../common/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';

interface Props {
    plan: IPlan;
}
export default function ViewAfterVE({ plan }: Props): JSX.Element {
    const { t } = useTranslation('common');

    return (
        <div>
            <Field label={t('plan_summary_is_good_practise')} hideIfEmpty={false}>
                {plan.is_good_practise ? t('yes') : t('no')}
            </Field>

            <Field label={t('plan_summary_underlying_ve_model')}>
                {plan.underlying_ve_model}
            </Field>

            <Field label={t('plan_summary_reflection')}>{plan.reflection}</Field>

            <Field label={t('plan_summary_reflection_file')}>
                {plan.evaluation_file && (
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
                )}
            </Field>

            <Field label={t('plan_summary_literature')}>{plan.literature}</Field>

            {plan.literature_files && plan.literature_files.length > 0 && (
                <Field label={t('plan_summary_literature_files')}>
                    <div className="flex flex-wrap gap-4">
                        {plan.literature_files.map((file, index) => (
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
                        ))}
                    </div>
                </Field>
            )}
        </div>
    );
}
