import React, { useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Timeline from '@/components/network/Timeline';
import ButtonNewPlan from '@/components/plans/ButtonNewPlan';
import { useTranslation } from 'next-i18next';
import { MdArrowRight } from 'react-icons/md';
import Button from '@/components/common/buttons/Button';
import Image from 'next/image';
import { SocketContext } from '@/pages/_app';
import H1 from '../common/H1';
import { useGetAvailablePlans, useGetOwnProfile } from '@/lib/backend';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import Link from 'next/link';
import H2 from '../common/H2';
import { Notification } from '@/interfaces/socketio';
import { FaMedal } from 'react-icons/fa';
import { IoMdNotificationsOutline } from 'react-icons/io';
import Timestamp from '../common/Timestamp';
import Swiper_LoggedIn from './Swiper_LoggedIn';

import btnNewVe from '@/images/btn_new_ve.svg';
import btnSearchUser from '@/images/btn_search_user.svg';
import btnGPPlans from '@/images/btn_gp_plans.svg';
import SuggestionBox from './SuggestionBox';
import UserInfoBox from './UserInfoBox';
import ButtonLight from '../common/buttons/ButtongLight';
import Error from '@/pages/_error';
import { TbFileText } from 'react-icons/tb';

interface Props {
    notificationEvents: Notification[];
    toggleNotifWindow(value?: boolean): void;
}

Dashboard.auth = true;
export default function Dashboard({ notificationEvents, toggleNotifWindow }: Props) {
    const socket = useContext(SocketContext);
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([]);

    const {
        data: plans,
        isLoading: isLoadingPlans,
        error: errorLoadingPlans,
    } = useGetAvailablePlans(session!.accessToken);
    const {
        data: profileInformation,
        isLoading: isLoadingProfile,
        error: errorLoadingProfile,
    } = useGetOwnProfile(session!.accessToken);

    useEffect(() => {
        if (!plans.length || !session) return;

        let sortedPlans = plans
            .filter(
                (plan) => plan.author.username != session?.user.preferred_username
                // && plan.is_good_practise
            )
            .sort((a, b) => {
                let av = a['last_modified']?.toString() || '';
                let bv = b['last_modified']?.toString() || '';
                return bv.localeCompare(av);
            });

        setSortedPlans(sortedPlans.slice(0, 5));
    }, [plans, session]);

    const VeDesignerButtons = () => (
        <>
            <ButtonNewPlan
                socket={socket}
                label={t('common:btn_new_ve')}
                className="bg-none w-full !px-0 !py-4"
            >
                <div className="flex flex-wrap @[230px]:flex-nowrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105">
                    <div className="w-1/3 shrink-0 flex items-center justify-center">
                        <span className="shrink-0 flex items-center justify-center w-[64px] h-[64px] text-ve-collab-blue rounded-full border border-2 border-ve-collab-blue">
                            <Image src={btnNewVe} alt={'form_image'} className="h-[36px]" />
                        </span>
                    </div>
                    <div className="w-full @[230px]:w-2/3 text-center text-wrap font-bold">
                        {t('common:btn_new_ve')}
                    </div>
                </div>
            </ButtonNewPlan>

            <div className="py-4">
                <Link
                    href={'/matching'}
                    className=" flex flex-wrap @[230px]:flex-nowrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105"
                >
                    <div className="w-1/3 shrink-0 flex items-center justify-center">
                        <span className="shrink-0 flex items-center justify-center w-[64px] h-[64px] text-ve-collab-blue rounded-full border border-2 border-ve-collab-blue">
                            <Image src={btnSearchUser} alt={'form_image'} className="h-[32px]" />
                        </span>
                    </div>
                    <div className="w-full @[230px]:w-2/3 text-center text-wrap font-bold">
                        {t('find_ve_partners')}
                    </div>
                </Link>
            </div>
        </>
    );

    const VeFeedWidget = () => (
        <div className="pb-6 mb-6 border-b-2 border-b-ve-collab-orange">
            <H1>{t('ve_feed')}</H1>
            <div>
                {sortedPlans.map((plan) => {
                    return (
                        <div
                            key={plan._id}
                            className="flex flex-col px-1 py-3 border-b border-bg-gray-300 bg-white/50 hover:bg-gray-100/50"
                        >
                            <Timestamp
                                timestamp={plan.last_modified}
                                className="text-sm text-slate-650 italic"
                            />
                            <div className="flex flex-row items-center">
                                <div className="grow flex items-center truncate ">
                                    <div className="mr-2 py-1 font-bold whitespace-nowrap truncate">
                                        <Link
                                            href={`/plan/${plan._id}`}
                                            className="hover:text-ve-collab-orange"
                                        >
                                            <TbFileText className="inline mr-1" size={20} />
                                            {plan.name}
                                        </Link>
                                    </div>
                                    {plan.is_good_practise && (
                                        <div className="mx-2 text-ve-collab-blue">
                                            <FaMedal
                                                title={t('common:plans_marked_as_good_practise')}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="">
                                    {plan.author.first_name} {plan.author.last_name}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 ml-auto py-2 px-4 w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                <ButtonLight link="/plans" className="!rounded-full">
                    {t('common:all')} {t('common:plans')}
                    <MdArrowRight size={24} className="inline mx-1" />
                </ButtonLight>
            </div>
        </div>
    );

    const NotificationWidget = () => (
        <div className="w-full m-6 rounded-md bg-white p-6 relative overflow-hidden drop-shadow">
            <div className="bg-ve-collab-orange-light w-[272px] h-[272px] -bottom-[136px] -right-[136px] absolute -z-10 rotate-45"></div>
            <div className="bg-ve-collab-orange/75 w-[232px] h-[232px] -bottom-[116px] -right-[116px] absolute -z-10 rotate-45"></div>
            <H2>{t('common:notifications.title')}</H2>

            <div className="flex  items-center ">
                <span className="flex items-center p-2 mr-2 rounded-full bg-ve-collab-blue/25">
                    <IoMdNotificationsOutline size={30} className="" />
                </span>
                {notificationEvents.length == 1 ? (
                    <span>{t('one_new_notification')}</span>
                ) : (
                    <span>
                        {t('multiple_new_notifications', {
                            count: notificationEvents.length,
                        })}
                    </span>
                )}
            </div>
            <div className="mt-6 ml-auto w-fit hover:bg-white/25 rounded-full transition easy-in-out">
                <Button
                    onClick={() => {
                        window.scrollTo(0, 0);
                        toggleNotifWindow();
                    }}
                >
                    {t('details')} <MdArrowRight size={24} className="inline mx-1" />
                </Button>
            </div>
        </div>
    );

    if (isLoadingProfile) return <></>;
    if (errorLoadingProfile) return <Error />;

    return (
        <>
            <div className="flex flex-wrap">
                <div className="order-1 hidden sm:flex w-full sm:w-1/2 lg:w-1/4 basis-full sm:basis-1/2 lg:basis-1/4 flex-col items-center px-6 mt-[28px]">
                    <UserInfoBox profileInformation={profileInformation} />
                </div>

                <div className="order-3 lg:order-2  w-full lg:w-1/2 basis-full lg:basis-1/2 ">
                    <Swiper_LoggedIn profileInformation={profileInformation} />

                    <div className="w-11/12 min-w-96 px-6 py-6 m-auto bg-white rounded-md drop-shadow">
                        <div className="text-2xl text-left">
                            <span className="text-ve-collab-orange">VE</span>{' '}
                            <span className="text-ve-collab-blue">Designer</span>
                        </div>
                        <div className="flex sm:hidden flex-row items-center mb-6 pb-2 border-b-2 border-b-ve-collab-orange">
                            <VeDesignerButtons />

                            <Link
                                href={'/plans'}
                                className="flex flex-wrap items-center justify-center"
                            >
                                <span className="self-center text-ve-collab-blue rounded-full p-2 my-2 mx-4 border border-ve-collab-blue">
                                    <FaMedal size={18} className="" />
                                </span>
                                <span className="text-center text-wrap xl:w-2/3 font-bold">
                                    {t('common:show_good_practice_plans')}
                                </span>
                            </Link>
                        </div>

                        <VeFeedWidget />

                        <div>
                            <H1 className="mt-6">{t('posts')}</H1>
                            <div className=" ">
                                <Timeline socket={socket} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="@container order-2 hidden sm:flex lg:order-3 w-full sm:w-1/2 lg:w-1/4 basis-full sm:basis-1/2 lg:basis-1/4 flex-col items-center gap-6 px-6">
                    <div className="w-full px-2 @[320px]:px-6 py-2 flex flex-col bg-white drop-shadow rounded-md">
                        <div className="text-2xl mx-2 mt-1">
                            <span className="text-ve-collab-orange">VE</span>{' '}
                            <span className="text-ve-collab-blue">Designer</span>
                        </div>
                        <div className="flex flex-col divide-y-2 divide-2 divide-ve-collab-orange px-2">
                            <VeDesignerButtons />

                            <div className="py-4">
                                <Link
                                    href={'/plans?isGP=true'}
                                    className="flex flex-wrap @[230px]:flex-nowrap items-center justify-center transition ease-in-out hover:scale-105"
                                >
                                    <div className="w-1/3 shrink-0 flex items-center justify-center">
                                        <span className="shrink-0 flex items-center justify-center w-[64px] h-[64px] text-ve-collab-blue rounded-full border border-2 border-ve-collab-blue">
                                            <Image
                                                src={btnGPPlans}
                                                alt={'form_image'}
                                                className="h-[42px]"
                                            />
                                        </span>
                                    </div>
                                    <div className="w-full @[230px]:w-2/3 text-center text-wrap font-bold">
                                        {t('common:show_good_practice_plans')}
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {notificationEvents.length > 0 && <NotificationWidget />}

                    {/* <div className="w-full px-2 xl:px-6 py-2 flex flex-col bg-white drop-shadow-lg rounded-md mt-[55px] ">
                        <div className="flex">
                            <span className="mx-2 self-center text-ve-collab-blue rounded-full p-2  border border-ve-collab-blue">
                                <FaMedal size={18} />
                            </span>
                            <H2>{t('common:good_practice_plans')}</H2>
                        </div>

                        <div>Gesamt: 123</div>

                        <div>Zuletzt: 12.03.2025</div>
                    </div> */}

                    <SuggestionBox />
                </div>
            </div>
        </>
    );
}
