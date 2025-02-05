import { useGetAvailablePlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

import btnNewVe from '@/images/btn_new_ve.svg';
import btnSearchUser from '@/images/btn_search_user.svg';
import { ProgressState } from '@/interfaces/ve-designer/sideProgressBar';
import { useRouter } from 'next/router';

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

Plans.auth = true;
Plans.noAuthPreview = <PlansNoAuthPreview />;

export default function Plans({ socket }: Props) {
    const { data: session } = useSession();
    const router = useRouter();

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

    // may initial only show GP plans
    useEffect(() => {
        if (router.query.isGP && router.query.isGP === 'true') {
            setFilterBy((prev) => [
                ...prev,
                {
                    id: 'isGoodPractice',
                    compare: (plan) => plan.is_good_practise === true,
                    value: true,
                },
            ]);
        }
    }, [router.query]);

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
            <CustomHead
                pageTitle={t('plans')}
                pageSlug={'plans'}
                pageDescription={t('plans_description')}
            />

            <div className="@container flex flex-wrap justify-between items-center mb-10 mt-12">
                <div>
                    <div className={'font-bold text-4xl mb-2'}>{t('plans')}</div>
                    <div className={'text-gray-500 text-xl'}>{t('plans_overview_subtitle')}</div>
                </div>

                <div className="w-full md:w-1/2 mt-2 md:m-0 flex content-center justify-end">
                    <ButtonNewPlan
                        socket={socket}
                        label={t('common:btn_new_ve')}
                        className="min-h-[50px] bg-none !px-4 !py-2 !rounded-full cursor-pointer shadow border bg-white hover:bg-gray-50"
                    >
                        <div className="flex items-center justify-center text-wrap font-bold">
                            <Image src={btnNewVe} alt={'form_image'} width={24} className="mr-2" />
                            {t('common:btn_new_ve')}
                        </div>
                    </ButtonNewPlan>

                    <div className="px-2">
                        <Link
                            href={'/matching'}
                            className="min-h-[50px] flex px-4 py-2 items-center justify-center text-wrap font-bold bg-white rounded-full cursor-pointer shadow border hover:bg-gray-50"
                        >
                            <Image
                                src={btnSearchUser}
                                alt={'form_image'}
                                width={32}
                                className="mr-2"
                            />
                            {t('find_ve_partners')}
                        </Link>
                    </div>
                </div>
            </div>

            <PlansBrowserFilter filterBy={filterBy} filterByCallback={handleFilterBy} />

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

function PlansNoAuthPreview() {
    const { t } = useTranslation('common');

    const filterBy = [
        {
            compare: () => true,
            id: 'author',
            value: undefined,
        },
    ];
    const sortBy: IsortBy = { key: 'last_modified', order: 'ASC' };
    const examplePlans: PlanPreview[] = [
        {
            _id: '1',
            name: 'VE Leipzig - Kuala Lumpur',
            author: {
                username: t('no_auth.username'),
                first_name: t('no_auth.first_name'),
                last_name: t('no_auth.last_name'),
                profile_pic: 'random_user.jpg',
                institution: '',
            },
            read_access: [t('no_auth.username')],
            write_access: [t('no_auth.username')],
            creation_timestamp: new Date(Date.now() - 24 * 2525 * 1000).toISOString(),
            last_modified: new Date(Date.now() - 2000 * 1000).toISOString(),
            is_good_practise: true,
            abstract: '',
            steps: [],
            topics: [],
            progress: {
                name: 'completed' as ProgressState,
                partners: 'completed' as ProgressState,
                institutions: 'completed' as ProgressState,
                lectures: 'completed' as ProgressState,
                target_groups: 'completed' as ProgressState,
                learning_goals: 'completed' as ProgressState,
                learning_env: 'completed' as ProgressState,
                methodical_approaches: 'completed' as ProgressState,
                evaluation: 'completed' as ProgressState,
                checklist: 'completed' as ProgressState,
                stepsGenerally: 'completed' as ProgressState,
                steps: [],
            },
        },
        {
            _id: '2',
            name: t('no_auth.plan_name'),
            author: {
                username: t('no_auth.username'),
                first_name: t('no_auth.first_name'),
                last_name: t('no_auth.last_name'),
                profile_pic: 'random_user.jpg',
                institution: '',
            },
            read_access: [t('no_auth.username')],
            write_access: [t('no_auth.username')],
            creation_timestamp: new Date(Date.now() - 24 * 1620 * 1000).toISOString(), // yesterday
            last_modified: new Date(Date.now() - 3430 * 1000).toISOString(), // one hour age
            is_good_practise: false,
            abstract: '',
            steps: [],
            topics: [],
            progress: {
                name: 'completed' as ProgressState,
                partners: 'completed' as ProgressState,
                institutions: 'completed' as ProgressState,
                lectures: 'completed' as ProgressState,
                target_groups: 'completed' as ProgressState,
                learning_goals: 'completed' as ProgressState,
                learning_env: 'completed' as ProgressState,
                methodical_approaches: 'not_started' as ProgressState,
                evaluation: 'not_started' as ProgressState,
                checklist: 'not_started' as ProgressState,
                stepsGenerally: 'not_started' as ProgressState,
                steps: [],
            },
        },
    ];

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('plans')}
                pageSlug={'plans'}
                pageDescription={t('plans_description')}
            />

            <div className="flex flex-wrap justify-between items-center mb-10 mt-12">
                <div>
                    <div className={'font-bold text-4xl mb-2'}>{t('plans')}</div>
                    <div className={'text-gray-500 text-xl'}>{t('plans_overview_subtitle')}</div>
                </div>

                <div className="w-full md:w-1/2 mt-2 md:m-0 flex content-center justify-end">
                    <ButtonNewPlan
                        isNoAuthPreview={true}
                        label={t('common:btn_new_ve')}
                        className="min-h-[50px] bg-none !px-4 !py-2 !rounded-full cursor-pointer shadow border bg-white hover:bg-gray-50"
                    >
                        <div className="flex items-center justify-center text-wrap font-bold">
                            <Image src={btnNewVe} alt={'form_image'} width={24} className="mr-2" />
                            {t('common:btn_new_ve')}
                        </div>
                    </ButtonNewPlan>

                    <div className="px-2">
                        <Link
                            href={'/matching'}
                            className="min-h-[50px] flex px-4 py-2 items-center justify-center text-wrap font-bold bg-white rounded-full cursor-pointer shadow border hover:bg-gray-50"
                        >
                            <Image
                                src={btnSearchUser}
                                alt={'form_image'}
                                width={32}
                                className="mr-2"
                            />
                            {t('find_ve_partners')}
                        </Link>
                    </div>
                </div>
            </div>

            <PlansBrowserFilter
                filterBy={filterBy}
                filterByCallback={() => {}}
                isNoAuthPreview={true}
            />

            <PlansBrowser
                plans={examplePlans}
                sortBy={sortBy}
                filterBy={filterBy}
                sortByCallback={() => {}}
                refetchPlansCallback={async () => {}}
                isNoAuthPreview={true}
            />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-slate-100 to-slate-100 pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
