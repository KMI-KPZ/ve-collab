import React, { useEffect, useRef, useState } from 'react';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import LoadingAnimation from '../LoadingAnimation';
import PopupSaveData from './PopupSaveData';
// import { itemsAllgemein, itemsEtappenplaner, mainMenu } from '@/data/sideMenuSteps';
import Container from '../Layout/container';
import WhiteBox from '../Layout/WhiteBox';
import { MdArrowForwardIos } from 'react-icons/md';
import Header from './Header';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import { mainMenu } from '@/data/sideMenuSteps';
import { Tooltip } from '../Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import Link from 'next/link';

interface Props {
    title: string;
    subtitle?: string;
    tooltip?: {text: string, link: string}
    methods: UseFormReturn<any, any, undefined>;
    children: React.ReactNode;
    prevpage?: string
    nextpage?: string
    // sideMenuStepsData?: SideMenuStep[]
    // progressBarStage?: number
    preventToLeave?: boolean

    stageInMenu?: string
    planerDataCallback: (data: any) => void
    submitCallback: (data: any) => unknown | Promise<{
        plan_id: string,
        field_name: string
        value: any
    }[]>
}

export default function Wrapper({
    title,
    subtitle,
    tooltip,
    children,
    methods,
    prevpage,
    nextpage,
    // sideMenuStepsData,
    // progressBarStage=0,
    stageInMenu='generally',
    preventToLeave=true,
    planerDataCallback,
    submitCallback }: Props
): JSX.Element {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [planerData, setPlanerData] = useState<IPlan>();
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
            if (preventToLeave === false) return

            if (wrapperRef.current && lastClickEvent && !wrapperRef.current.contains(lastClickEvent.target as Node)) {
                //  may prompt only if we have unsaved changes?!
                if (!methods.formState.isDirty) return
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

    }, [wrapperRef, methods, router, preventToLeave]);

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
                if (!data || !data.plan) {
                    // TODO show error
                    console.log('Error: failed to fetch plannner data', {data});
                    return
                }

                setPlanerData(data.plan as IPlan);
                planerDataCallback(data.plan as IPlan)
            }
        );
    }, [session, status, router, planerDataCallback]);

    const handleSubmit = async (data: any) => {
        setLoading(true)
        const fields = await submitCallback(data)
        console.log('Wrapper.handlesubmit', {fields});


        if (fields) {
            await fetchPOST(
                '/planner/update_fields',
                { update: fields },
                session?.accessToken
            );
        }
        setLoading(false)
    }

    const Breadcrumb = () => {
        const currentPath = usePathname()
        const mainMenuItem = mainMenu.find(a => a.id == stageInMenu)
        let subMenuItem = mainMenuItem?.submenu.find(a => a.link == currentPath)

        if (stageInMenu == 'steps') {
            const currentStep = planerData?.steps.find(a => currentPath.endsWith(a.name))
            subMenuItem = currentStep ? {
                    id: currentStep.name.toLowerCase(),
                    text: currentStep.name,
                    link: `/ve-designer/step-data/${encodeURIComponent(currentStep.name)}`
                } : undefined
        }

        return (
            <div className='text-normale py-2 flex items-center text-slate-500'>
                <MdArrowForwardIos size={15} /> {mainMenuItem?.text}
                {subMenuItem && 'text' in subMenuItem && (
                    <><MdArrowForwardIos size={15} /> {subMenuItem.text}</>
                )}
            </div>
        );
    }

    return (
        <div className="bg-pattern-left-blue bg-no-repeat" ref={wrapperRef}>
            <Container>
                <WhiteBox>
                    <div className="flex flex-col">
                        <FormProvider {...methods}>
                            {/* TODO implement an PopUp alternative or invalid data */}
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

                            <Header
                                methods={methods}
                                submitCallback={handleSubmit}
                                handleUnsavedData={(data: any, continueLink: string) => {
                                    setPopUp({isOpen: true, continueLink: continueLink})
                                }}

                            />

                            <div className='flex flex-row divide-x gap-1'>

                                <Sidebar
                                    methods={methods}
                                    submitCallback={handleSubmit}
                                    handleInvalidData={(data: any, continueLink: string) => {
                                        setPopUp({isOpen: true, continueLink: continueLink})
                                    }}
                                    progressState={planerData?.progress}
                                />

                                <form className="w-full px-6 pt-1 max-w-screen-2xl flex flex-col gap-x-4">

                                    <Breadcrumb />

                                    <div className={'flex justify-between items-start mt-2 mb-2'}>
                                        <h2 className='font-bold text-2xl'>
                                            {title}
                                        </h2>
                                        {typeof tooltip !== 'undefined' && (
                                            <Tooltip tooltipsText={tooltip.text}>
                                                <Link
                                                    target="_blank"
                                                    href={tooltip.link}
                                                    className='rounded-full shadow hover:bg-gray-50 p-2 mx-2'
                                                >
                                                    <PiBookOpenText size={30} color="#00748f" className='inline relative' />
                                                </Link>
                                            </Tooltip>
                                        )}
                                    </div>
                                    {typeof subtitle !== 'undefined' && (<p className='text-xl text-slate-600 mb-4'>{subtitle}</p>)}

                                    {loading &&
                                        (<>
                                            <div className='absolute w-full h-full bg-slate-50/50 blur-2xl'></div>
                                            <div className='absolute'><LoadingAnimation /></div>
                                        </>
                                    )}

                                    {children}

                                    <div className='my-8 border-t py-3 flex justify-between'>

                                        <div className="basis-20">
                                            {typeof prevpage !== 'undefined' && (
                                                <button
                                                    type="button"
                                                    className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"


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
                                                        async (data: any) => {
                                                            setPopUp({isOpen: true, continueLink: prevpage})
                                                        }
                                                    )}
                                                >
                                                    Zurück
                                                </button>
                                            )}
                                        </div>

                                        <div className='basis-20'>
                                            {typeof nextpage !== 'undefined' && (
                                                <button
                                                    type="button"
                                                    className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"

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
                        </FormProvider>

                    </div>
                </WhiteBox>
            </Container>
        </div>
    );
}
