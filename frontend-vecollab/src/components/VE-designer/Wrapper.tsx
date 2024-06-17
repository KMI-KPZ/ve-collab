import React, { useEffect, useRef, useState } from 'react';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchGET, fetchPOST, useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import LoadingAnimation from '../LoadingAnimation';
import PopupSaveData from './PopupSaveData';
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
import Alert from '../Alert';

interface Props {
    title: string;
    subtitle?: string;
    tooltip?: {text: string, link: string}
    methods: UseFormReturn<any, any, undefined>;
    children: React.ReactNode;
    prevpage?: string
    nextpage?: string
    preventToLeave?: boolean

    stageInMenu?: string // TODO make it unrequired
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
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [updateSidebar, setUpdateSidebar] = useState(false)
    const currentPath = usePathname()
    const [isDirty, setIsDirty] = useState<boolean>(false)

    // detect window close or a click outside of planer
    useEffect(() => {
        if (!router.isReady) return;
        let clickedOutside: boolean = false

        const handleClickOutside = (e: MouseEvent) => {
            clickedOutside = !wrapperRef?.current?.contains(e.target as Node) || false
        }

        const handleBrowseAway = (nextlink: string) => {
            if (preventToLeave === false) return

            // form was not changed
            if (!methods.formState.isDirty) return

            if (clickedOutside) {
                setPopUp({isOpen: true, continueLink: nextlink.replace(/\?.*/, '')})
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

    // const { data: plan, isLoading, error, mutate } = useGetPlanById(router.query.plannerId as string);
    // useEffect(() => {
    //     if (!plan || isLoading) return

    //     // BUG: if we do not log isDirty here, our first change will not trigger the form to be dirty ...
    //     // console.log('Wrapper', {plan, isDirty: methods.formState.isDirty});
    //     setIsDirty(methods.formState.isDirty)
    //     setLoading(false)
    //     planerDataCallback(plan)
    // }, [plan, isLoading, methods, planerDataCallback]);

    useEffect(() => {
        if (!router.isReady || status === 'loading' || !session) {
            return;
        }
        if (!router.query.plannerId) {
            router.push('/plans');
            return
        }

        // avoid overwrite changes (#272)
        if (typeof planerData !== 'undefined') return

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
                // BUG: if we do not log isDirty here, our first change will not trigger the form to be dirty ...
                setIsDirty(methods.formState.isDirty)
            }
        );
    }, [session, status, router, planerData, methods, planerDataCallback]);

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
        // await mutate()
    }

    const Breadcrumb = () => {
        if (!planerData || !planerData.steps) return (<></>);
        const mainMenuItem = mainMenu.find(a => a.id == stageInMenu)
        let subMenuItem = mainMenuItem?.submenu.find(a => a.link == currentPath)

        if (stageInMenu == 'steps') {
            const currentStep = planerData.steps.find(a => currentPath.endsWith(encodeURIComponent(a.name)))

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

    // if (!router.query.plannerId  || error) {
    //     console.log(error); // TODO alert/re-route
    //     return (<></>);
    // }

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
                                    if (popUp.continueLink && popUp.continueLink != '') {
                                        await router.push({
                                            pathname: popUp.continueLink,
                                            query: popUp.continueLink.startsWith('/ve-designer') ? {
                                                plannerId: router.query.plannerId,
                                            } : {},
                                        });
                                    } else {
                                        setPopUp(prev => { return {...prev, isOpen: false}})
                                        setLoading(false)
                                    }
                                }}
                                handleCancel={() => {
                                    setPopUp(prev => { return {...prev, isOpen: false}})
                                    setLoading(false)
                                }}
                            />

                            {successPopupOpen && <Alert message='Gespeichert' autoclose={2000} onClose={() => setSuccessPopupOpen(false)} />}

                            <Header
                                methods={methods}
                                submitCallback={async d => {
                                    await handleSubmit(d)
                                    setLoading(false)
                                    setSuccessPopupOpen(true)
                                    // manual update sidebar after changed user steps
                                    if (currentPath.startsWith('/ve-designer/step-names')) {
                                        setUpdateSidebar(true)
                                        setTimeout(() => setUpdateSidebar(false), 1);
                                    }
                                }}
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
                                    stageInMenu={stageInMenu}
                                    updateSidebar={updateSidebar}
                                />

                                <form className="relative w-full px-6 pt-1 max-w-screen-2xl flex flex-col gap-x-4">

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
                                            <div className='absolute w-full h-full -ml-6 bg-slate-50/75 blur-lg'></div>
                                            <div className='absolute left-1/2 translate-x-1/2 top-10'><LoadingAnimation /></div>
                                        </>
                                    )}

                                    {children}

                                    {(typeof prevpage !== 'undefined' || typeof nextpage !== 'undefined') && (
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
                                    )}
                                </form>
                            </div>
                        </FormProvider>
                    </div>
                </WhiteBox>
            </Container>
        </div>
    );
}
