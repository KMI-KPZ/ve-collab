import { useGetAvailablePlans } from '@/lib/backend';
import { useEffect, useState } from 'react';
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
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';
import { MdArrowBackIos, MdArrowForwardIos } from 'react-icons/md';

export interface IplansFilter {
    goodPracticeOnly?: boolean;
    owner?: 'all' | 'own' | 'shared';
    searchQuery?: string;
    limit?: number;
    offset?: number;
    sortBy?: keyof PlanPreview;
    order?: 'ASC' | 'DESC';
}

const defaultFilter: IplansFilter = {
    goodPracticeOnly: false,
    owner: 'all',
    searchQuery: '',
    limit: 10,
    offset: 0,
    sortBy: 'last_modified',
    order: 'ASC',
};

interface Props {
    socket: Socket;
}

Plans.auth = true;
Plans.noAuthPreview = <PlansNoAuthPreview />;

export default function Plans({ socket }: Props) {
    const router = useRouter();
    const { t } = useTranslation('common');

    const [filterBy, setFilterBy] = useState<IplansFilter>(defaultFilter);
    const pageLength = 10;

    const { data: plans, isLoading, error, mutate } = useGetAvailablePlans(filterBy);
    const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);

    // may initial only show GP plans
    useEffect(() => {
        if (router.query.isGP && router.query.isGP === 'true') {
            setFilterBy((prev) => ({ ...prev, goodPracticeOnly: true }));
        }

        if (router.query.page) {
            const page = parseInt(router.query.page as string) - 1;
            setFilterBy((prev) => ({
                ...prev,
                offset: page * pageLength,
            }));
            setIsLoadingPage(false);
        }
    }, [router.query]);

    /**
     * Add/Remove/Update filter method
     * Usage: See description in IplansFilter
     */
    const handleFilterBy = (filter: IplansFilter) => {
        if (filter.sortBy) {
            setFilterBy((prev) => ({ ...prev, ...filter }));
        } else {
            // reset offset; avoids also double requests in useEffect!
            setFilterBy((prev) => ({ ...prev, ...filter, offset: 0 }));
            setTimeout(() => {
                gotoPage(1);
            }, 1);
        }
    };

    const gotoPage = (number: number) => {
        setIsLoadingPage(true);
        router.push(`?page=${number}`, undefined, {
            shallow: true,
        });
        window.scrollTo({ behavior: 'smooth', top: 0 });
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

            {isLoading || isLoadingPage ? (
                <div className="m-12 flex">
                    <LoadingAnimation className="!inline-block !w-fit" />
                    <span className="ml-6">{t('loading_plans')}</span>
                </div>
            ) : (
                <>
                    <PlansBrowser
                        plans={plans}
                        filterBy={filterBy}
                        filterByCallback={handleFilterBy}
                        refetchPlansCallback={mutate}
                    />
                    {plans.length >= pageLength || filterBy.offset! > 0 ? (
                        <div className="flex items-center justify-center -mt-6 mb-12 space-x-4">
                            <ButtonLightBlue
                                onClick={() => {
                                    gotoPage((filterBy.offset! - pageLength) / pageLength + 1);
                                }}
                                disabled={filterBy.offset! == 0}
                                className="!rounded-full"
                            >
                                <MdArrowBackIos className="inline mr-2" />
                                {t('prev_page')}
                            </ButtonLightBlue>
                            <ButtonLightBlue
                                onClick={() => {
                                    gotoPage((pageLength + filterBy.offset!) / pageLength + 1);
                                }}
                                disabled={plans.length < pageLength}
                                className="!rounded-full"
                            >
                                {t('next_page')}
                                <MdArrowForwardIos className="inline ml-2" />
                            </ButtonLightBlue>
                        </div>
                    ) : (
                        <></>
                    )}
                </>
            )}
        </>
    );
}

function PlansNoAuthPreview() {
    const { t } = useTranslation('common');
    const [filterBy, setFilterBy] = useState<IplansFilter>(defaultFilter);
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
                filterBy={filterBy}
                filterByCallback={() => {}}
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
