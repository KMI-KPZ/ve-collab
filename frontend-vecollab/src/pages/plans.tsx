import { useGetAvailablePlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdKeyboardDoubleArrowRight } from 'react-icons/md';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { PlansBrowser } from '@/components/plans/PlansBrowser';
import { PlansBrowserFilter } from '@/components/plans/PlansBrowserFilter';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import Alert from '@/components/common/dialogs/Alert';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export interface IfilterBy {
    /** compare function
      * If compare is undefined the filter (id) will removed  */
    compare: undefined | ((plan: PlanPreview) => boolean);
    /** id of the filter function (used in filterBy array) */
    id: string;
    /** value of the filter, required to recognise current filter  */
    value: any
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
    const { t } = useTranslation('common')
    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([]);
    const [filterBy, setFilterBy] = useState<IfilterBy[]>([
        {
            compare: () => true,
            id: 'author',
            value: undefined
        }
    ]);
    const [sortBy, setSortBy] = useState<IsortBy>({ key: 'last_modified', order: 'ASC' });

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
                sortedPlans = sortedPlans.filter((p) =>
                    typeof filter.compare !== 'undefined' ?  filter.compare(p) : true
                );
            });
        }

        // console.log({ filterBy, sortedPlans });

        setSortedPlans([...sortedPlans]);
    }, [plans, isLoading, sortBy, filterBy]);

    const handleSortBy = (key: keyof PlanPreview) => {
        setSortBy((prev) => {
            return {
                key: key,
                order: prev.order == 'ASC' ? 'DESC' : 'ASC',
            };
        });
    };

    /**
     * Add/Remove/Update filter method
     * Usage: See description in IfilterBy
     */
    const handleFilterBy = ({ compare, id, value }: IfilterBy) => {
        if (typeof compare === 'undefined') {
            setFilterBy((prev) =>
                prev.filter(f => f.id != id)
            );
        } else {
            if (filterBy.find((f) => f.id == id)) {
                setFilterBy((prev) =>
                    prev.map((f) => (f.id == id ? { id, compare, value } : f))
                );
            } else {
                setFilterBy((prev) => [...prev, { id, compare, value }]);
            }
        }
    };

    return (
        <>
            <div className="flex justify-between mb-6 mt-12">
                <div>
                    <div className={'font-bold text-4xl mb-2'}>{t('plans')}</div>
                    <div className={'text-gray-500 text-xl'}>
                        {t("plans_overview_subtitle")}
                    </div>
                </div>

                <div className="w-1/3 p-2 text-center rounded-lg shadow bg-white">
                    <div>
                        {t("matching_question")}
                    </div>
                    <Link
                        href={'/matching'}
                        className=" inline-block py-2 px-5 text-ve-collab-blue font-bold"
                    >
                        <MdKeyboardDoubleArrowRight className="inline" /> {t("go_matching")}
                    </Link>
                </div>
            </div>

            <PlansBrowserFilter
                socket={socket}
                filterBy={filterBy}
                filterByCallback={handleFilterBy}
            />

            {typeof error !== 'undefined' && (
                <Alert
                    type="error"
                    message={'Error loading plans. See console for details.'}
                />
            )}

            {isLoading ? (
                <div className="m-12">
                    <LoadingAnimation size="small" /> {t("loading_plans")}
                </div>
            ) : (
                <PlansBrowser
                    plans={sortedPlans}
                    sortBy={sortBy}
                    filterBy={filterBy}
                    sortByCallback={handleSortBy}
                    refetchPlansCallback={mutate}
                />
            )}
        </>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', [
                'common',
            ])),
        },
    }
}
