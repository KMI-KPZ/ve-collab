import React from 'react';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import PlansBrowserItem from './PlansBrowserItem';
import { IfilterBy, IsortBy } from '@/pages/plans';
import { useTranslation } from 'next-i18next';

interface Props {
    plans: PlanPreview[];
    sortBy: IsortBy;
    filterBy: IfilterBy[];
    sortByCallback: (key: keyof PlanPreview) => void;
    refetchPlansCallback: () => Promise<void>;
}

export function PlansBrowser({
    plans,
    sortBy,
    filterBy,
    sortByCallback,
    refetchPlansCallback,
}: Props) {
    const { t } = useTranslation('common');

    const SortArrow = ({ by }: { by: keyof PlanPreview }) => {
        if (by != sortBy.key) return <></>;

        return (
            <>
                {sortBy.order == 'DESC' ? (
                    <MdArrowDownward className="inline m-1 text-gray-500 group-hover:text-gray-700" />
                ) : (
                    <MdArrowUpward className="inline m-1 text-gray-500 group-hover:text-gray-700" />
                )}
            </>
        );
    };

    return (
        <>
            <div className="mb-6 rounded-lg shadow bg-white overflow-scroll md:overflow-auto w-full text-left border-1 border-gray-400">
                <div className="flex flex-row space-x-3 py-2 items-center bg-gray-300 rounded-t-lg text-base font-semibold">
                    <div className="basis-1/12 text-center">{t('plans_table_progress')}</div>
                    <div
                        className="grow md:basis-5/12 hover:underline hover:cursor-pointer group"
                        onClick={() => sortByCallback('name')}
                    >
                        {t('plans_table_name')}
                        <SortArrow by="name" />
                    </div>
                    <div className="basis-1/6">{t('plans_table_author')}</div>
                    <div
                        className="basis-1/6 hover:underline hover:cursor-pointer group hidden md:block"
                        onClick={() => sortByCallback('last_modified')}
                    >
                        {t('plans_table_last_modified')}
                        <SortArrow by="last_modified" />
                    </div>
                    <div
                        className="basis-1/6 hover:underline hover:cursor-pointer group hidden md:block"
                        onClick={() => sortByCallback('creation_timestamp')}
                    >
                        {t('plans_table_created')}
                        <SortArrow by="creation_timestamp" />
                    </div>
                </div>

                <div>
                    {plans.length == 0 ? (
                        <div className="m-12">
                            {filterBy.find((f) => f.id == 'otherAuthor')
                                ? filterBy.find((f) => f.id == 'isGoodPractice')
                                    ? t('plans_no_good_practise_plan_shared')
                                    : t('plans_no_plan_shared')
                                : filterBy.find((f) => f.id == 'isGoodPractice')
                                    ? t('plans_no_good_practise_plan_created')
                                    : t('plans_no_plan_created')}
                        </div>
                    ) : (
                        plans.map((plan, index) => (
                            <div
                                key={index}
                                className="flex flex-row py-3 px-1 space-x-3 items-center border-b border-bg-gray-300 hover:bg-gray-100"
                            >
                                <PlansBrowserItem
                                    key={index}
                                    plan={plan}
                                    refetchPlansCallback={refetchPlansCallback}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
