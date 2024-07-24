import React from 'react';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import PlannerOverviewItem from './PlannerOverviewItem';
import { IfilterBy, IsortBy } from '@/pages/plans';

interface Props {
    plans: PlanPreview[];
    sortBy: IsortBy;
    filterBy: IfilterBy[];
    sortByCallback: (key: keyof PlanPreview) => void;
    refetchPlansCallback: () => Promise<void>;
}

export function PlansOverview({
    plans,
    sortBy,
    filterBy,
    sortByCallback,
    refetchPlansCallback
}: Props) {

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
            <div className="rounded-lg shadow bg-white overflow-scroll md:overflow-auto w-full text-left border-1 border-gray-400">
                <div className="flex flex-row space-x-3 items-center bg-gray-300 rounded-t-lg text-base font-semibold">
                    <div className="basis-1/12 text-center">Progress</div>
                    <div
                        className="grow p-3 hover:underline hover:cursor-pointer group"
                        onClick={() => sortByCallback('name')}
                    >
                        Name
                        <SortArrow by="name" />
                    </div>
                    <div className="basis-1/6">Autor</div>
                    <div
                        className="basis-1/6 hover:underline hover:cursor-pointer group"
                        onClick={() => sortByCallback('last_modified')}
                    >
                        Geändert
                        <SortArrow by="last_modified" />
                    </div>
                    <div
                        className="basis-1/6 hover:underline hover:cursor-pointer group"
                        onClick={() => sortByCallback('creation_timestamp')}
                    >
                        Erstellt
                        <SortArrow by="creation_timestamp" />
                    </div>
                </div>

                <div>
                    {plans.length == 0 ? (
                        <div className="m-12">
                            {filterBy.find((f) => f.id == 'otherAuthor')
                                ? `Es wurde noch kein ${(filterBy.find((f) => f.id == 'isGoodPractice')) ? '"Good Practice"' : ''} Plan mit Dir geteilt`
                                : `Du hast noch keinen ${filterBy.find((f) => f.id == 'isGoodPractice') ? '"Good Practice"' : ''} Plan erstellt`
                            }
                        </div>
                    ) : (
                        plans.map((plan, index) => (
                            <div
                                key={index}
                                className="flex flex-row space-x-3 items-center border-b border-bg-gray-300 hover:bg-gray-100"
                            >
                                <PlannerOverviewItem
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