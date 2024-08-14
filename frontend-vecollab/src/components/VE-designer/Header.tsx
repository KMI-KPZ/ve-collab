import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MdEditSquare, MdMeetingRoom } from 'react-icons/md';
import { UseFormReturn } from 'react-hook-form';
import { Socket } from 'socket.io-client';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { dropPlanLock } from './Wrapper';
import { useGetAvailablePlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    submitCallback: (data: any) => void;
    handleUnsavedData: (data: any, continueLink: string) => void;
    handleInvalidData: (data: any, continueLink: string) => void;
    socket: Socket;
    plan: IPlan
}

export default function Header({
    methods,
    plan,
    submitCallback,
    handleUnsavedData,
    handleInvalidData,
    socket
}: Props) {
    const router = useRouter();

    return (
        <div className="p-3 flex justify-between flex-wrap border-b">
            <div className="text-4xl font-bold flex-nowrap text-slate-400 w-1/2 truncate">
                <span className="text-ve-collab-orange">VE</span>{' '}
                <span className="text-ve-collab-blue">Designer</span>
                {plan && plan.name && <span className="ml-4 text-2xl">• {plan.name}</span>}
            </div>

            <div className="">
                <Link href={`/etherpad/${router.query.plannerId}`} target="_blank" className="mx-2">
                    <button
                        type="submit"
                        className=" px-4 py-2 rounded-full text-ve-collab-blue bg-[#d8f2f9] shadow hover:bg-slate-50"
                        title="Kollaboratives Pad öffnen"
                    >
                        <MdEditSquare className="inline" /> Pad
                    </button>
                </Link>
                <Link href={`/meeting/${router.query.plannerId}`} target="_blank" className="mx-2">
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                        title="Jitsi Raum betreten"
                    >
                        <MdMeetingRoom className="inline" /> Video
                    </button>
                </Link>

                <button
                    className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                    onClick={async (e) => {
                        if (Object.keys(methods.formState.dirtyFields).length > 0) {
                            handleUnsavedData(null, '/plans');
                        } else {
                            await dropPlanLock(socket, router.query.plannerId)
                            await router.push({
                                pathname: '/plans',
                                query: {},
                            });
                        }
                    }}
                >
                    Beenden
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
                            handleInvalidData(data, '')
                        }
                    )}
                >
                    Speichern
                </button>
            </div>
        </div>
    );
}
