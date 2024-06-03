import React, { useEffect, useRef, useState } from 'react';
import HeadProgressBarSection from '@/components/VE-designer/HeadProgressBarSection';
import SideProgressBarWithReactHookFormWithoutPopUp from '@/components/VE-designer/SideProgressBarWithReactHookFormWithoutPopUp';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import LoadingAnimation from '../LoadingAnimation';
import PopupSaveData from './PopupSaveData';
import { ISideProgressBarStates } from '@/interfaces/ve-designer/sideProgressBar';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    children: React.ReactNode;
    prevpage?: string
    nextpage?: string

    setProgress: (progress: ISideProgressBarStates) => void
    planerDataCallback: (data: any) => void
    submitCallback: (data: any) => unknown | Promise<{
        plan_id: string,
        field_name: string
        value: any
    }[]>
}

export default function Wrapper({
    children,
    methods,
    prevpage,
    nextpage,
    setProgress,
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
    const wrapperRef = useRef<null | HTMLDivElement>(null);

    // detect window close or a click outside of planer
    useEffect(() => {
        if (!router.isReady) return;
        let lastClickEvent: MouseEvent

        const handleClickOutside = (e: MouseEvent) => lastClickEvent = e

        const handleBrowseAway = (nextlink: any) => {
            if (wrapperRef.current && lastClickEvent && !wrapperRef.current.contains(lastClickEvent.target as Node)) {
                //  may prompt only if we have unsaved changes?!
                // if (!methods.formState.isDirty) return
                //      console.log('handleBrowseAway', {isDirty: methods.formState.isDirty});

                setPopUp({isOpen: true, continueLink: nextlink})
                router.events.emit('routeChangeError');
                throw 'routeChange aborted.';
            }
        };

        const handleWindowClose = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        }

        window.addEventListener("mousedown", handleClickOutside);
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("beforeunload", handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };

    }, [wrapperRef, methods, router]);

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
                if (Object.keys(data.plan.progress).length) {
                    setProgress(data.plan.progress);
                }
                setPlanerData(data.plan as IPlan);
                planerDataCallback(data.plan as IPlan)
            }
        );
    }, [session, status, router, planerDataCallback, setProgress]);

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
        <div ref={wrapperRef}>
            <FormProvider {...methods}>
                <PopupSaveData
                    isOpen={popUp.isOpen}
                    handleContinue={async () => {
                        await router.push({
                            pathname: popUp.continueLink,
                            query: popUp.continueLink.startsWith('/ve-designer') ? {
                                plannerId: router.query.plannerId,
                            } : {},
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
                                                        await handleSubmit(data)

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
        </div>
    );
}
