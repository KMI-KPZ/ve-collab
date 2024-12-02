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
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetStaticPropsContext } from 'next';
import CustomHead from '@/components/metaData/CustomHead';
import ButtonNewPlan from '@/components/plans/ButtonNewPlan';
import Image from 'next/image';

import handsPuzzleImg from '@/images/puzzle_hands_web.jpg';
import newFormImg from '@/images/newForm_sm.jpg';

export interface IfilterBy {
    /** compare function
     * If compare is undefined the filter (id) will removed  */
    compare: undefined | ((plan: PlanPreview) => boolean);
    /** id of the filter function (used in filterBy array) */
    id: string;
    /** value of the filter, required to recognise current filter  */
    value: any;
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
    const { t } = useTranslation('common');
    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([]);
    const [filterBy, setFilterBy] = useState<IfilterBy[]>([
        {
            compare: () => true,
            id: 'author',
            value: undefined,
        },
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
                    typeof filter.compare !== 'undefined' ? filter.compare(p) : true
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
            setFilterBy((prev) => prev.filter((f) => f.id != id));
        } else {
            if (filterBy.find((f) => f.id == id)) {
                setFilterBy((prev) => prev.map((f) => (f.id == id ? { id, compare, value } : f)));
            } else {
                setFilterBy((prev) => [...prev, { id, compare, value }]);
            }
        }
    };

    return (
        <>
            <CustomHead pageTitle={t('plans')} pageSlug={'plans'} />

            <div className="flex flex-wrap justify-between items-center mb-10 mt-12">
                <div>
                    <div className={'font-bold text-4xl mb-2'}>{t('plans')}</div>
                    <div className={'text-gray-500 text-xl'}>{t('plans_overview_subtitle')}</div>
                </div>

                <div className="w-full md:w-1/2 mt-2 md:m-0 flex content-center justify-end">
                    <Link
                        href={'/matching'}
                        className="w-1/2 shadow border bg-white rounded-full mx-4 px-4 flex flex-wrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105"
                    >
                        <Image
                            src={handsPuzzleImg}
                            alt={t('find_ve_partners')}
                            className="w-[96px] rounded-full"
                        />
                        <div className="font-bold text-center text-wrap xl:w-1/2">
                            {t('find_ve_partners')}
                        </div>
                    </Link>

                    <ButtonNewPlan
                        socket={socket}
                        label={t('btn_new_va')}
                        className="w-1/2 bg-white border shadow rounded-full mx-4 cursor-pointer transition ease-in-out hover:scale-105"
                    >
                        <div className="flex flex-wrap items-center justify-center ">
                            <Image
                                src={newFormImg}
                                alt={t('btn_new_va')}
                                className="w-[96px] rounded-full"
                            />
                            <div className="font-bold text-center text-wrap xl:w-1/2">
                                {t('btn_new_va')}
                            </div>
                        </div>
                    </ButtonNewPlan>
                </div>
            </div>

            <PlansBrowserFilter
                socket={socket}
                filterBy={filterBy}
                filterByCallback={handleFilterBy}
            />

            {typeof error !== 'undefined' && (
                <Alert type="error" message={'Error loading plans. See console for details.'} />
            )}

            {isLoading ? (
                <div className="m-12">
                    <LoadingAnimation size="small" /> {t('loading_plans')}
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

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
