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

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    submitCallback: (data: any) => void;
    handleUnsavedData: (data: any, continueLink: string) => void;
    handleInvalidData: (data: any, continueLink: string) => void;
    socket: Socket;
    plan: IPlan;
}

export default function Header({
    methods,
    plan,
    submitCallback,
    handleUnsavedData,
    handleInvalidData,
    socket,
}: Props) {
    const router = useRouter();
    const { t } = useTranslation('common');

    return (
        <div className="p-3 flex justify-between flex-wrap gap-y-2 border-b">
            <div className="grow text-4xl font-bold flex flex-nowrap items-end text-slate-400 w-full lg:w-1/2">
                <span className="text-ve-collab-orange">VE</span>
                <span className="text-ve-collab-blue ml-2">Designer</span>
                {plan && plan.name && <span className="ml-4 text-2xl truncate before:content-['•'] before:mr-2">{plan.name}</span>}
                {plan.is_good_practise && (
                    <span className='mx-2 self-center text-ve-collab-blue rounded-full p-2 border border-ve-collab-blue'>
                        <FaMedal title={t('plans_marked_as_good_practise')} size={18} />
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between w-full lg:w-fit">
                <div className='flex items-center'>
                    <Link href={`/etherpad/${router.query.plannerId}`} target="_blank" className="mx-2">
                    <button
                        type="submit"
                        className=" px-4 py-2 rounded-full text-ve-collab-blue bg-[#d8f2f9] shadow hover:bg-slate-50"
                        title={t('open_collaborative_pad')}
                    >
                        <MdEditSquare className="inline" /> Pad
                    </button>
                </Link>
                <Link href={`/meeting/${router.query.plannerId}`} target="_blank" className="mx-2">
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                        title={t('enter_jtsi')}
                    >
                        <MdMeetingRoom className="inline" /> Video
                    </button>
                </Link></div>

                <div><button
                    className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                    onClick={async (e) => {
                        if (Object.keys(methods.formState.dirtyFields).length > 0) {
                            handleUnsavedData(null, '/plans');
                        } else {
                            await dropPlanLock(socket, router.query.plannerId);
                            await router.push({
                                pathname: '/plans',
                                query: {},
                            });
                        }
                    }}
                >
                    {t("exit")}
                </button>

                <button
                    className="mx-2 px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
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
                    {t("save")}
                </button></div>
            </div>
        </div>
    );
}