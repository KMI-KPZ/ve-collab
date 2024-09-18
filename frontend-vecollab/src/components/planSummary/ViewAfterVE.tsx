import React, { useState } from 'react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import iconDropdown from '@/images/icons/planSummary/iconDropdown.png';
import Image from 'next/image';
import { showDataOrEmptySign } from './PlanSummary';
import { AuthenticatedFile } from '../common/AuthenticatedFile';
import { RxFile } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';

interface Props {
    plan: IPlan;
    openAllBoxes?: boolean;
}
export default function ViewAttributes({ plan, openAllBoxes }: Props): JSX.Element {
    const { t } = useTranslation('common');

    const [isOpenShowMore, setIsOpenShowMore] = useState<boolean>(openAllBoxes ? true : false);

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
                <div className="text-2xl font-semibold">{t("plan_summary_gpb_documentation")}</div>
            </div>
            {isOpenShowMore ? (
                <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                    <span className="font-semibold pr-5">
                        {t("plan_summary_is_good_practise")}
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit bg-slate-200 rounded-lg p-2">
                            {plan.is_good_practise ? t("yes") : t("no")}
                        </li>
                    </ul>
                    <span className="text-base font-semibold pr-5 print:hidden">
                        {t("plan_summary_underlying_ve_model")}
                    </span>
                    <span className="font-semibold pr-5 hidden print:block">
                        {t("plan_summary_underlying_ve_model_line_break")}
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
                    <span className="text-base font-semibold pr-5">{t("plan_summary_reflection")}</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.reflection ? (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2 whitespace-pre-line">
                                {showDataOrEmptySign(plan.reflection)}
                            </li>
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">{t("plan_summary_reflection_file")}</span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit rounded-lg p-2 whitespace-pre-line">
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
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </li>
                    </ul>
                    <span className="text-base font-semibold pr-5">
                        {t("plan_summary_literature")}
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        {plan.literature ? (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2 whitespace-pre-line">
                                {showDataOrEmptySign(plan.literature)}
                            </li>
                        ) : (
                            <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                        )}
                    </ul>
                    <span className="text-base font-semibold pr-5">
                        {t("plan_summary_literature_files")}
                    </span>
                    <ul className="flex flex-col space-y-2 col-span-3">
                        <li className="flex w-fit rounded-lg p-2 whitespace-pre-line">
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
                                                <div className="justify-center mx-2 px-1 my-1 font-bold text-slate-900 text-lg text-center truncate">
                                                    {file.file_name}
                                                </div>
                                            </AuthenticatedFile>
                                        );
                                    })}
                                </>
                            ) : (
                                <li className="flex w-fit bg-slate-200 rounded-lg p-2">/</li>
                            )}
                        </li>
                    </ul>
                </section>
            ) : (
                <section className="grid grid-cols-4 gap-8 border-2 border-gray-400 rounded-3xl p-4">
                    <span className="font-semibold pr-5">
                        {t("plan_summary_is_good_practise")}
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
                        {t("plan_summary_show_more")}
                    </span>
                </section>
            )}
        </>
    );
}
