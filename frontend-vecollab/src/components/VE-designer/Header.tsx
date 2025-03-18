import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MdEditSquare, MdMeetingRoom } from 'react-icons/md';
import { UseFormReturn } from 'react-hook-form';
import { Socket } from 'socket.io-client';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { dropPlanLock } from './PlanSocket';
import { useTranslation } from 'next-i18next';
import { FaMedal } from 'react-icons/fa';
import { Tooltip } from '../common/Tooltip';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    submitCallback: (data: any) => void;
    handleUnsavedData: (data: any, continueLink: string) => void;
    handleInvalidData: (data: any, continueLink: string) => void;
    socket?: Socket;
    plan: IPlan;
    isNoAuthPreview?: boolean;
}

export default function Header({
    methods,
    plan,
    submitCallback,
    handleUnsavedData,
    handleInvalidData,
    socket,
    isNoAuthPreview = false,
}: Props) {
    const router = useRouter();
    const { t } = useTranslation('common');

    if (isNoAuthPreview) {
        return (
            <div className="p-3 flex justify-between flex-wrap gap-y-2 border-b border-gray-200">
                <div className="grow text-4xl font-bold flex flex-nowrap items-end text-slate-400 w-full lg:w-1/2">
                    <span className="text-ve-collab-orange">VE</span>
                    <span className="text-ve-collab-blue ml-2">Designer</span>
                    {plan && plan.name && (
                        <span className="ml-4 text-2xl truncate before:content-['•'] before:mr-2">
                            {plan.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between w-full lg:w-fit">
                    <div className="flex items-center">
                        <button
                            type="submit"
                            className=" px-4 py-2 rounded-full text-ve-collab-blue bg-[#d8f2f9] shadow-sm"
                            title={t('open_collaborative_pad')}
                            disabled
                        >
                            <MdEditSquare className="inline" /> Pad
                        </button>

                        <button
                            type="submit"
                            className="px-4 py-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue"
                            title={t('enter_jtsi')}
                            disabled
                        >
                            <MdMeetingRoom className="inline" /> Video
                        </button>
                    </div>

                    <div>
                        <button
                            className="mx-2 px-4 py-2 shadow-sm border border-ve-collab-orange text-ve-collab-orange rounded-full cursor-default"
                            onClick={() => {}}
                        >
                            {t('exit')}
                        </button>

                        <button
                            className="mx-2 px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange cursor-default"
                            onClick={() => {}}
                        >
                            {t('save')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 flex justify-between flex-wrap gap-y-2 border-b border-b-gray-200">
            <div className="grow text-4xl font-bold flex flex-wrap items-end text-slate-400 w-full lg:w-1/2">
                <span>
                    <span className="text-ve-collab-orange">VE</span>
                    <span className="text-ve-collab-blue ml-2">Designer</span>
                </span>
                {plan && plan.name && (
                    <span className="ml-4 text-2xl truncate before:content-['•'] before:mr-2">
                        {plan.name}
                    </span>
                )}
                {plan.is_good_practise && (
                    <span className="mx-2 text-ve-collab-blue rounded-full p-2 border border-ve-collab-blue">
                        <FaMedal title={t('plans_marked_as_good_practise')} size={18} />
                    </span>
                )}
            </div>

            <div className="flex items-center justify-end md:justify-between flex-wrap gap-y-2 w-full lg:w-fit">
                <div className="flex items-center">
                    {router.query.plannerId !== undefined ? (
                        <>
                            <Link
                                href={
                                    router.query.plannerId
                                        ? `/etherpad/${router.query.plannerId}`
                                        : ''
                                }
                                target="_blank"
                                className="mx-2 px-4 py-2 flex items-center  rounded-full text-ve-collab-blue bg-[#d8f2f9] shadow-sm hover:bg-slate-50"
                                title={t('open_collaborative_pad')}
                            >
                                <MdEditSquare className="inline mr-1" /> Pad
                            </Link>
                            <Link
                                href={
                                    router.query.plannerId
                                        ? `/meeting/${router.query.plannerId}`
                                        : ''
                                }
                                target="_blank"
                                className="mx-2 px-4 py-2 flex items-center rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                                title={t('enter_jtsi')}
                            >
                                <MdMeetingRoom className="inline mr-1" /> Video
                            </Link>
                        </>
                    ) : (
                        <>
                            <Tooltip tooltipsText={t('save_first')} position="bottom">
                                <button
                                    type="submit"
                                    className="mx-2 px-4 py-2 flex items-center rounded-full text-ve-collab-blue bg-[#d8f2f9] shadow-sm cursor-not-allowed	"
                                    disabled
                                >
                                    <MdEditSquare className="inline mr-1" /> Pad
                                </button>
                            </Tooltip>
                            <Tooltip tooltipsText={t('save_first')} position="bottom">
                                <button
                                    type="submit"
                                    className="mx-2 px-4 py-2 flex items-center  rounded-full bg-[#d8f2f9] text-ve-collab-blue shadow cursor-not-allowed	"
                                    title={t('save_first')}
                                    disabled
                                >
                                    <MdMeetingRoom className="inline mr-1" /> Video
                                </button>
                            </Tooltip>
                        </>
                    )}
                </div>

                <div>
                    <button
                        className="mx-2 px-4 py-2 shadow-sm border border-ve-collab-orange text-ve-collab-orange rounded-full cursor-pointer"
                        onClick={async (e) => {
                            // TODO handleInvalidData ...
                            if (Object.keys(methods.formState.dirtyFields).length > 0) {
                                handleUnsavedData(null, '/plans');
                            } else {
                                await dropPlanLock(socket!, router.query.plannerId);
                                await router.push({
                                    pathname: '/plans',
                                    query: {},
                                });
                            }
                        }}
                    >
                        {t('exit')}
                    </button>

                    <button
                        className="mx-2 px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange cursor-pointer"
                        onClick={methods.handleSubmit(
                            // valid form
                            async (data: any) => {
                                await submitCallback(data);
                            },
                            // invalid form
                            async (data: any) => {
                                handleInvalidData(data, '');
                            }
                        )}
                    >
                        {t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
