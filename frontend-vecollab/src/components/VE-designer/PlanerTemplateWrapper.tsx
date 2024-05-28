import React, { useEffect, useState } from 'react';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import SideProgressBarWithReactHookFormWithoutPopUp from '@/components/VE-designer/SideProgressBarWithReactHookFormWithoutPopUp';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import LoadingAnimation from '../LoadingAnimation';
import PopupSaveData from './PopupSaveData';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    children: React.ReactNode;
    prevpage?: string
    nextpage?: string

    planerDataCallback: (data: any) => void
    submitCallback: (data: any) => unknown | Promise<{
        plan_id: string,
        field_name: string
        value: any
    }[]>
}

// TODO Weiter, Zurück button + combinedSubmitRouteAndUpdate in parent verschieben
// TODO react query (https://tanstack.com/query/) einbauen
// TODO interface for planerData, loading?, daten hin und herschieben, mehr reactHookForm vllt noch in parent
// TODO Error onSubmit -> einzeln durchgeben?
// TODO Topmenu mit submit refactoren

export default function PlanerTemplateWrapper({
    children,
    methods,
    prevpage,
    nextpage,
    planerDataCallback,
    submitCallback }: Props
): JSX.Element {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [planerData, setPlanerData] = useState<any>();
    const [loading, setLoading] = useState(true);
    const [popUp, setPopUp] = useState<{ isOpen: boolean; continueLink: string }>({
        isOpen: false,
        continueLink: '/plans',
    });

    useEffect(() => {
        if (!router.isReady || status === 'loading' || !session) {
            return;
        }
        if (!router.query.plannerId) {
            router.push('/plans');
            return
        }

        fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
            data => {
                setLoading(false)
                setPlanerData(data.plan as IPlan);
                planerDataCallback(data.plan as IPlan)
            }
        );
    }, [session, status, router]);

    const handleSubmit = async (data: any) => {
        setLoading(true)
        const fields = await submitCallback(data)

        if (fields) {
            await fetchPOST(
                '/planner/update_fields',
                { update: fields },
                session?.accessToken
            );
        }
    }

    return (
        <FormProvider {...methods}>
             <PopupSaveData
                isOpen={popUp.isOpen}
                handleContinue={async () => {
                    await router.push({
                        pathname: popUp.continueLink,
                        query: {
                            plannerId: router.query.plannerId,
                        },
                    });
                }}
                handleCancel={() => setPopUp(prev => { return {...prev, isOpen: false}} )}
            />

            <div className="flex bg-pattern-left-blue-small bg-no-repeat">
                <div className="flex flex-grow justify-center">
                    <div className="flex flex-col">
                        <HeadProgressBarSection
                            stage={0}
                            linkFineStep={planerData?.steps[0]?.name}
                        />

                        <form className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col flex-grow justify-between">

                            {loading &&
                                (<>
                                    <div className='absolute w-full h-full bg-slate-50/50 blur-2xl'></div>
                                    <div className='absolute'><LoadingAnimation /></div>
                                </>
                            )}

                            {children}

                            <div className="flex w-full justify-between">
                                <div>
                                    {typeof prevpage !== 'undefined' && (
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"

                                            onClick={methods.handleSubmit(
                                                // valid
                                                async (data: any) => {
                                                    await submitCallback(data)

                                                    router.push({
                                                        pathname: prevpage,
                                                        query: { plannerId: router.query.plannerId }
                                                    })
                                                },
                                                // invalid
                                                async () => {
                                                    setPopUp({isOpen: true, continueLink: prevpage})
                                                }
                                            )}
                                        >
                                            Zurück
                                        </button>
                                    )}

                                </div>
                                <div>
                                    {typeof nextpage !== 'undefined' && (
                                        <button
                                            type="button"
                                            className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"

                                            onClick={methods.handleSubmit(
                                                // valid
                                                async (data: any) => {
                                                    await handleSubmit(data)

                                                    router.push({
                                                        pathname: nextpage,
                                                        query: { plannerId: router.query.plannerId }
                                                    })
                                                },
                                                // invalid
                                                async () => {
                                                    setPopUp({isOpen: true, continueLink: nextpage})
                                                }
                                            )}
                                        >
                                            Weiter
                                        </button>
                                    )}

                                </div>
                            </div>

                        </form>
                    </div>
                </div>
                <SideProgressBarWithReactHookFormWithoutPopUp
                    progressState={planerData?.progress}
                    onSubmit={handleSubmit}
                />
            </div>
        </FormProvider>
    );
}
