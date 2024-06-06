import React, {  } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MdEditSquare, MdMeetingRoom } from 'react-icons/md';
import { useGetPlanById } from '@/lib/backend';
import { UseFormReturn } from 'react-hook-form';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    submitCallback: (data: any) => void,
    handleUnsavedData: (data: any, continueLink: string) => void,
    // plan: IPlan
}

export default function Header({
    methods,
    submitCallback,
    handleUnsavedData
}: Props) {
    const router = useRouter();

    // note: works better than passing {plan} as property!! (no flickering)
    const { data: plan, isLoading } = useGetPlanById(router.query.plannerId as string);

    return (
            <div className="p-3 flex justify-between flex-wrap border-b">
                <div className='text-4xl font-bold flex-nowrap'>
                    <span className='text-ve-collab-orange'>VE</span> <span className='text-ve-collab-blue'>Designer</span>
                    {plan && (<span className='ml-4 text-slate-400 text-2xl'>• {plan.name}</span>)}
                </div>

                <div className=''>

                    <Link href={`/etherpad/${router.query.plannerId}`} target="_blank" className="mx-2">
                        <button
                            type="submit"
                            className=" px-4 py-2 rounded-full text-ve-collab-blue bg-[#d8f2f9] shadow hover:bg-slate-50"
                            title='Kollaboratives Pad öffnen'
                        >
                            <MdEditSquare className='inline' /> Pad
                        </button>
                    </Link>
                    <Link href={`/meeting/${router.query.plannerId}`} target="_blank" className="mx-2">
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-full bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                            title='Jitsi Raum betreten'
                        >
                            <MdMeetingRoom className='inline' /> Video
                        </button>
                    </Link>

                    <button
                        className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                        onClick={e => {
                            if (methods.formState.isDirty) {
                                // TODO does not work (eg changing the name doe not changes the formstate?!)
                                handleUnsavedData(null, '/plans')
                            } else {
                                router.push({
                                    pathname: '/plans',
                                    query: { plannerId: router.query.plannerId }
                                })
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
                                await submitCallback(data)
                            },
                            // invalid form
                            // TODO open another Popup (data is invalid PopUp)
                            async (data: any) => {
                                handleUnsavedData(data, '')
                            }
                        )}
                    >
                        Speichern
                    </button>
                </div>
            </div>
    );
}
