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

import handsPuzzleImg from '@/images/puzzle_hands_web.jpg';
import newFormImg from '@/images/newForm_sm.jpg';
import SuggestionBox from './SuggestionBox';
import UserInfoBox from './UserInfoBox';
import ButtonLight from '../common/buttons/ButtongLight';

interface Props {
    notificationEvents: Notification[];
    toggleNotifWindow(value?: boolean): void;
}

Frontpage_LoggedIn.auth = true;
export default function Frontpage_LoggedIn({ notificationEvents, toggleNotifWindow }: Props) {
    const socket = useContext(SocketContext);
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([]);

    const {
        data: plans,
        isLoading: isLoadingPlans,
        error,
    } = useGetAvailablePlans(session!.accessToken);
    const { data: profileInformation, isLoading: isLoadingProfile } = useGetOwnProfile(
        session!.accessToken
    );

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

    const VeDesignerButtonsSM = () => (
        <div className="flex sm:hidden mb-6 pb-6 flex-row items-center border-b-2 border-b-ve-collab-orange">
            <div className="text-2xl text-center">
                <span className="text-ve-collab-orange">VE</span>{' '}
                <span className="text-ve-collab-blue">Designer</span>
            </div>

            <ButtonNewPlan socket={socket} label={t('common:btn_new_ve')} className="bg-none !p-0">
                <div className="flex flex-wrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105">
                    <Image src={newFormImg} alt={'form_image'} className="w-[96px] rounded-full" />
                    <div className="text-center text-wrap xl:w-1/2">{t('common:btn_new_ve')}</div>
                </div>
            </ButtonNewPlan>

            <Link
                href={'/matching'}
                className="px-2 flex flex-wrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105"
            >
                <Image
                    src={handsPuzzleImg}
                    alt={t('puzzle_image')}
                    className="w-[96px] rounded-full"
                />
                <div className="text-center text-wrap xl:w-1/2">{t('find_ve_partners')}</div>
            </Link>
        </div>
    );

    const VeDesignerButtons = () => (
        <div className="w-full px-2 xl:px-6 py-2 flex flex-col bg-white drop-shadow-lg rounded-md mt-[55px] ">
            <div className="text-2xl -mt-[62px] h-[62px] rounded-t-md bg-white px-4 -ml-[8px] xl:-ml-[24px] -mr-[8px] xl:-mr-[24px] pt-[11px]">
                <span className="text-ve-collab-orange">VE</span>{' '}
                <span className="text-ve-collab-blue">Designer</span>
            </div>

            <ButtonNewPlan
                socket={socket}
                label={t('common:btn_new_ve')}
                className="bg-none mb-6 border-b-2 border-b-ve-collab-orange !px-2 -mt-[16px] !rounded-none font-bold"
            >
                <div className="flex flex-wrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105">
                    <Image
                        src={newFormImg}
                        alt={t('form_image')}
                        className="w-[96px] rounded-full"
                    />
                    <div className="text-center text-wrap xl:w-1/2">{t('common:btn_new_ve')}</div>
                </div>
            </ButtonNewPlan>

            <Link
                href={'/matching'}
                className="px-2 mb-6 flex flex-wrap items-center justify-center cursor-pointer transition ease-in-out hover:scale-105"
            >
                <Image
                    src={handsPuzzleImg}
                    alt={t('puzzle_image')}
                    className="w-[96px] rounded-full"
                />
                <div className="text-center text-wrap xl:w-1/2 font-bold">
                    {t('find_ve_partners')}
                </div>
            </Link>
        </div>
    );

    const NotificationWidget = () => (
        <div className="w-full m-6 rounded-md bg-white p-6 relative overflow-hidden drop-shadow-lg">
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

    return (
        <>
            <div className="flex flex-wrap">
                <div className="order-1 hidden sm:flex w-full sm:w-1/2 lg:w-1/4 basis-full sm:basis-1/2 lg:basis-1/4 flex-col items-center px-6 mt-[28px]">
                    <UserInfoBox profileInformation={profileInformation} />
                </div>

                <div className="order-3 lg:order-2  w-full lg:w-1/2 basis-full lg:basis-1/2 ">
                    <Swiper_LoggedIn profileInformation={profileInformation} />

                    <div className="w-11/12 min-w-96 px-6 py-6 m-auto bg-white rounded-md">
                        <VeDesignerButtonsSM />

                        <div className="pb-6 mb-6 border-b-2 border-b-ve-collab-orange">
                            <div className="flex justify-between items-center">
                                <H1>{t('ve_feed')}</H1>
                                {/* <ButtonLight link="/plans" className="!rounded-full">
                                    {t('common:all')} {t('common:plans')}
                                </ButtonLight> */}
                            </div>
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
                                                        <Link href={`/plan/${plan._id}`}>
                                                            {plan.name}
                                                        </Link>
                                                    </div>
                                                    {plan.is_good_practise && (
                                                        <div className="mx-2 text-ve-collab-blue">
                                                            <FaMedal
                                                                title={t(
                                                                    'common:plans_marked_as_good_practise'
                                                                )}
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
                                {/* <Link href={`/plans`}>
                                    {t('common:all')}{' '}
                                    <MdArrowRight size={24} className="inline mx-1" />
                                </Link> */}
                            </div>
                        </div>

                        <div>
                            <H1 className="mt-6">{t('posts')}</H1>
                            <div className=" ">
                                <Timeline socket={socket} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-2 hidden sm:flex lg:order-3 w-full sm:w-1/2 lg:w-1/4 basis-full sm:basis-1/2 lg:basis-1/4 flex-col items-center gap-6 px-6">
                    <VeDesignerButtons />

                    {notificationEvents.length > 0 && <NotificationWidget />}

                    <SuggestionBox />
                </div>
            </div>
        </>
    );
}
