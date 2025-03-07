import React from 'react';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import PlansBrowserItem from './PlansBrowserItem';
import { IplansFilter } from '@/pages/plans';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

interface Props {
    plans: PlanPreview[];
    filterBy: IplansFilter;
    filterByCallback: (filter: IplansFilter) => void;
    refetchPlansCallback: () => Promise<void>;
    isNoAuthPreview?: boolean;
}

export function PlansBrowser({
    plans,
    filterBy,
    filterByCallback,
    refetchPlansCallback,
    isNoAuthPreview = false,
}: Props) {
    const { t } = useTranslation('common');
    const router = useRouter();

    const SortArrow = ({ by }: { by: keyof PlanPreview }) => {
        if (isNoAuthPreview) return <></>;

        if (by != filterBy.sortBy) return <></>;

        return (
            <>
                {filterBy.order == 'DESC' ? (
                    <MdArrowDownward className="inline m-1 text-gray-500 group-hover:text-gray-700" />
                ) : (
                    <MdArrowUpward className="inline m-1 text-gray-500 group-hover:text-gray-700" />
                )}
            </>
        );
    };

    const handleSortBy = (key: keyof PlanPreview) => {
        filterByCallback({ sortBy: key, order: filterBy.order == 'ASC' ? 'DESC' : 'ASC' });
    };

    return (
        <>
            <div className="mb-12 rounded-lg shadow-sm bg-white w-full text-left">
                <div className="flex flex-row space-x-3 py-2 items-center bg-gray-300 rounded-t-lg text-base font-semibold">
                    <div className="basis-1/12 text-center hidden md:block"></div>
                    <div
                        className={`grow md:basis-5/12 group ${
                            isNoAuthPreview ? '' : 'hover:underline hover:cursor-pointer'
                        }`}
                        onClick={() => handleSortBy('name')}
                    >
                        {t('plans_table_name')}
                        <SortArrow by="name" />
                    </div>
                    <div className="basis-1/6">{t('plans_table_author')}</div>
                    <div
                        className={`basis-1/6 group hidden sm:block ${
                            isNoAuthPreview ? '' : 'hover:underline hover:cursor-pointer'
                        }`}
                        onClick={() => handleSortBy('last_modified')}
                    >
                        {t('plans_table_last_modified')}
                        <SortArrow by="last_modified" />
                    </div>
                    <div
                        className={`basis-1/6 group hidden md:block ${
                            isNoAuthPreview ? '' : 'hover:underline hover:cursor-pointer'
                        }`}
                        onClick={() => handleSortBy('creation_timestamp')}
                    >
                        {t('plans_table_created')}
                        <SortArrow by="creation_timestamp" />
                    </div>
                </div>

                <div>
                    {plans.length == 0 ? (
                        <div className="p-12">
                            {parseInt(router.query.page as string) > 1 ||
                            filterBy.owner == 'shared' ||
                            filterBy.goodPracticeOnly === true ||
                            filterBy.searchQuery!.length > 0
                                ? t('plans_nothing_matches')
                                : t('plans_no_plan_created')}
                        </div>
                    ) : (
                        plans.map((plan, index) => (
                            <div
                                key={index}
                                className={`flex flex-row min-h-[72px] p-1 space-x-3 items-center border-b border-b-gray-200 ${
                                    isNoAuthPreview ? '' : 'hover:bg-gray-100'
                                }`}
                            >
                                <PlansBrowserItem
                                    key={index}
                                    plan={plan}
                                    refetchPlansCallback={refetchPlansCallback}
                                    isNoAuthPreview={isNoAuthPreview}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
