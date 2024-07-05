import { fetchGET, useGetAvailablePlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdKeyboardDoubleArrowRight } from 'react-icons/md';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { PlansOverview } from '@/components/Plannner/PlansOverview';
import { PlansOverviewFilter } from '@/components/Plannner/PlansOverviewFilter';
import LoadingAnimation from '@/components/LoadingAnimation';
import { ISideProgressBarStates } from '@/interfaces/ve-designer/sideProgressBar';
import Alert from '@/components/Alert';
import { Socket } from 'socket.io-client';
import Dialog from '@/components/profile/Dialog';
import { set } from 'date-fns';
import { PlansOverviewFilterGoodPractise } from '@/components/Plannner/PlansOverviewFilterGoodPractise';

export interface IfilterBy {
    planKey: keyof PlanPreview;
    /** compare function to compare the plan[planKey].planValue of a plan   */
    compare: (planValue: string | string[] | boolean | ISideProgressBarStates) => boolean;
    id?: string;
}

export interface IsortBy {
    key: keyof PlanPreview;
    order: 'ASC' | 'DESC';
}

interface Props {
    socket: Socket;
}

// authentication is required on this page
Plans.auth = true;
export default function Plans({ socket }: Props) {
    const { data: session } = useSession();
    const [isGoodPractiseDialogOpen, setIsGoodPractiseDialogOpen] = useState(false);
    const [isGoodPractisePlansLoading, setIsGoodPractisePlansLoading] = useState(false);
    const [goodPractisePlans, setGoodPractisePlans] = useState<PlanPreview[]>([]);

    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([]);
    const [sortedGoodPractisePlans, setSortedGoodPractisePlans] = useState<PlanPreview[]>([]);

    const [filterBy, setFilterBy] = useState<IfilterBy[]>([]);
    const [filterByGoodPractise, setFilterByGoodPractise] = useState<IfilterBy[]>([]);

    const [sortBy, setSortBy] = useState<IsortBy>({ key: 'creation_timestamp', order: 'ASC' });
    const [sortByGoodPractise, setSortByGoodPractise] = useState<IsortBy>({
        key: 'creation_timestamp',
        order: 'ASC',
    });

    const { data: plans, isLoading, error, mutate } = useGetAvailablePlans(session!.accessToken);

    useEffect(() => {
        if (isLoading || !plans.length) return;

        let sortedPlans = plans.sort((a, b) => {
            let av = a[sortBy.key]?.toString() || '';
            let bv = b[sortBy.key]?.toString() || '';

            return sortBy.order == 'DESC' ? av.localeCompare(bv) : bv.localeCompare(av);
        });

        if (filterBy && filterBy.length) {
            filterBy.forEach((filter) => {
                sortedPlans = sortedPlans.filter((p) => {
                    return p[filter.planKey] && filter.compare(p[filter.planKey]);
                });
            });
        }

        console.log({ sortedPlans });

        setSortedPlans([...sortedPlans]);
    }, [plans, isLoading, sortBy, filterBy]);

    useEffect(() => {
        if (isLoading || !goodPractisePlans.length) return;

        let sortedGoodPractisePlans = goodPractisePlans.sort((a, b) => {
            let av = a[sortByGoodPractise.key]?.toString() || '';
            let bv = b[sortByGoodPractise.key]?.toString() || '';

            return sortByGoodPractise.order == 'DESC' ? av.localeCompare(bv) : bv.localeCompare(av);
        });

        if (filterByGoodPractise && filterByGoodPractise.length) {
            filterByGoodPractise.forEach((filter) => {
                sortedGoodPractisePlans = sortedGoodPractisePlans.filter((p) => {
                    return p[filter.planKey] && filter.compare(p[filter.planKey]);
                });
            });
        }

        console.log({ sortedGoodPractisePlans });

        setSortedGoodPractisePlans([...sortedGoodPractisePlans]);
    }, [goodPractisePlans, isLoading, sortByGoodPractise, filterByGoodPractise]);

    const handleSortBy = (key: keyof PlanPreview) => {
        setSortBy((prev) => {
            return {
                key: key,
                order: prev.order == 'ASC' ? 'DESC' : 'ASC',
            };
        });
    };

    const handleSortByGoodPractise = (key: keyof PlanPreview) => {
        setSortByGoodPractise((prev) => {
            return {
                key: key,
                order: prev.order == 'ASC' ? 'DESC' : 'ASC',
            };
        });
    };

    const handleFilterBy = ({ planKey, compare, id }: IfilterBy) => {
        if (filterBy.find((f) => f.planKey == planKey)) {
            // update existing filter
            setFilterBy((prev) =>
                prev.map((f) => (f.planKey == planKey ? { id, planKey, compare } : f))
            );
        } else {
            setFilterBy((prev) => [...prev, { id, planKey, compare }]);
        }
    };

    const handleFilterByGoodPractise = ({ planKey, compare, id }: IfilterBy) => {
        if (filterByGoodPractise.find((f) => f.planKey == planKey)) {
            // update existing filter
            setFilterByGoodPractise((prev) =>
                prev.map((f) => (f.planKey == planKey ? { id, planKey, compare } : f))
            );
        } else {
            setFilterByGoodPractise((prev) => [...prev, { id, planKey, compare }]);
        }
    };

    const handleOpenGoodPractiseDialog = () => {
        setIsGoodPractiseDialogOpen(true);
        setIsGoodPractisePlansLoading(true);

        // fetch good practise plans
        fetchGET('/planner/get_good_practise', session!.accessToken).then((response) => {
            if (response.success === true) {
                setGoodPractisePlans(response.plans);
            } else {
                // TODO alert
            }
            setIsGoodPractisePlansLoading(false);
        });
    };

    return (
        <>
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue-small bg-no-repeat">
                <div className="container mx-auto mb-14 px-5 p-12">
                    <div className="flex justify-between mb-6">
                        <div>
                            <div className={'font-bold text-4xl mb-2'}>Pläne</div>
                            <div className={'text-gray-500 text-xl'}>
                                Übersicht Deiner oder mit Dir geteilten Pläne
                            </div>
                        </div>

                        <div className="w-1/3 p-2 text-center rounded-lg shadow bg-white">
                            <div>
                                Noch auf der Suche nach neuen Partner:innen für den nächsten VE?
                            </div>
                            <Link
                                href={'/matching'}
                                className=" inline-block py-2 px-5 text-ve-collab-blue font-bold"
                            >
                                <MdKeyboardDoubleArrowRight className="inline" /> zum Matching
                            </Link>
                        </div>
                    </div>

                    <PlansOverviewFilter
                        socket={socket}
                        filterBy={filterBy}
                        filterByCallback={handleFilterBy}
                        goodPractiseDialogOpenCallback={handleOpenGoodPractiseDialog}
                    />

                    {typeof error !== 'undefined' && (
                        <Alert
                            type="error"
                            message={'Error loading plans. See console for details.'}
                        />
                    )}

                    {isLoading ? (
                        <div className="m-12">
                            <LoadingAnimation size="small" /> lade Pläne ...
                        </div>
                    ) : (
                        <PlansOverview
                            plans={sortedPlans}
                            sortBy={sortBy}
                            filterBy={filterBy}
                            sortByCallback={handleSortBy}
                            refetchPlansCallback={mutate}
                        />
                    )}
                </div>
            </div>
            {isGoodPractiseDialogOpen && (
                <Dialog
                    isOpen={isGoodPractiseDialogOpen}
                    title={'Good Practise Beispiele'}
                    onClose={() => setIsGoodPractiseDialogOpen(false)}
                >
                    <div className="w-[80rem]">
                        {isGoodPractisePlansLoading ? (
                            <div className="m-12">
                                <LoadingAnimation size="small" /> lade Pläne ...
                            </div>
                        ) : (
                            <>
                                <PlansOverviewFilterGoodPractise
                                    filterBy={filterByGoodPractise}
                                    filterByCallback={handleFilterByGoodPractise}
                                />
                                <PlansOverview
                                    plans={sortedGoodPractisePlans}
                                    sortBy={sortByGoodPractise}
                                    filterBy={filterByGoodPractise}
                                    sortByCallback={handleSortByGoodPractise}
                                    refetchPlansCallback={() => new Promise(() => {})}
                                />
                            </>
                        )}
                    </div>
                </Dialog>
            )}
        </>
    );
}
