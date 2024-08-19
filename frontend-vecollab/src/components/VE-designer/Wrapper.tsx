import React, { useEffect, useRef, useState } from 'react';
import { FieldValues, FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchPOST, useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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
import Alert, { AlertState } from '../Alert';
import { Socket } from 'socket.io-client';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { GiSadCrab } from 'react-icons/gi';
import { dropPlanLock, getPlanLock } from './PlanSocket';
import { SocketIOServerResponse } from '@/interfaces/socketio';

interface Props {
    title: string;
    subtitle?: string;
    description?: string[] | string;
    tooltip?: { text: string; link: string };
    methods: UseFormReturn<any>;
    children: React.ReactNode;
    prevpage?: string;
    nextpage?: string;
    preventToLeave?: boolean;

    stageInMenu?: string; // TODO make it unrequired
    planerDataCallback: (data: any) => FieldValues;
    submitCallback: (data: any) =>
        | unknown
        | Promise<
              {
                  plan_id: string;
                  field_name: string;
                  value: any;
              }[]
          >;
    socket: Socket;
}

export default function Wrapper({
    title,
    subtitle,
    description,
    tooltip,
    children,
    methods,
    prevpage,
    nextpage,
    stageInMenu = 'generally',
    preventToLeave = true,
    planerDataCallback,
    submitCallback,
    socket,
}: Props): JSX.Element {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [popUp, setPopUp] = useState<{
        isOpen: boolean;
        continueLink: string,
        type?: "unsaved"|"invalid"
    }>({
        isOpen: false,
        continueLink: '/plans',
    });
    const wrapperRef = useRef<null | HTMLDivElement>(null);
    const [alert, setAlert] = useState<AlertState>({ open: false });
    const currentPath = usePathname();

    // fetch plan
    const {
        data: plan,
        isLoading,
        error,
        mutate: mutateGetPlanById,
    } = useGetPlanById(router.query.plannerId as string);

    // detect window close or a click outside of planer
    useEffect(() => {
        if (!router.isReady) return;
        let clickedOutside: boolean = false;

        const handleClickOutside = (e: MouseEvent) => {
            clickedOutside = !wrapperRef?.current?.contains(e.target as Node) || false;
        };

        const handleBrowseAway = (nextlink: string) => {
            if (preventToLeave === false) return;

            if (clickedOutside) {
                if (Object.keys(methods.formState.dirtyFields).length == 0) {
                    dropPlanLock(socket, router.query.plannerId as string)
                } else {
                    setPopUp({ isOpen: true, continueLink: nextlink.replace(/\?.*/, '') });
                    router.events.emit('routeChangeError');
                    throw 'routeChange aborted.';
                }

            }
        };

        const handleWindowClose = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };

        window.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [wrapperRef, methods, socket, router, preventToLeave]);

    // check access rights or locked plan
    useEffect(() => {
        if (isLoading || !session || error) return;

        if (!router.query.plannerId) {
            router.push('/plans');
            return;
        }

        getPlanLock(socket, router.query.plannerId)
        .catch(response => {
            if (response.reason === 'plan_locked') {
                // const data = await
                fetchPOST(
                    '/profile_snippets',
                    { usernames: [response.lock_holder] },
                    session?.accessToken
                )
                .then(data => {
                    const userSnippet = data.user_snippets.find(
                        (snippet: BackendUserSnippet) => snippet.username === response.lock_holder
                    );
                    const displayName = userSnippet
                        ? `${userSnippet.first_name} ${userSnippet.last_name}`
                        : response.lock_holder;
                    setAlert({
                        message: `Dieser Plan wird gerade von ${displayName} bearbeitet. Änderungen werden nicht gespeichert!`,
                        // autoclose: 10000,
                        type: 'warning',
                        onClose: () => setAlert({ open: false }),
                    });
                })
            }
        })

        // write access or author check
        if (
            !plan.write_access.includes(session?.user.preferred_username!) &&
            plan.author !== session?.user.preferred_username!
        ) {
            setAlert({
                message: 'Sie haben keine Berechtigung, um diesen Plan zu bearbeiten.',
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
        }
    }, [plan, isLoading, error, socket, router, session]);

    // call data callback and rest form defaults for correct form valdation (form.isDirty)
    useEffect(() => {
        if (!plan || isLoading || error) return;

        (async () => {
            const data = await planerDataCallback(plan);
            if (Object.keys(data).length) {
                // reset form default values for isDirty check
                methods.reset(data)
            }
            setLoading(false)
        })();
        return () => {}
    }, [
        plan,
        isLoading,
        error,
        planerDataCallback,
        methods
    ]);

    // submit formdata & reload plan
    const handleSubmit = async (data: any) => {
        setLoading(true);
        const fields = await submitCallback(data);

        if (fields) {
            const res = await fetchPOST(
                '/planner/update_fields',
                { update: fields },
                session?.accessToken
            );
            if (res.success === false) {
                console.log({ res });
                setAlert({
                    message: 'Fehler beim speichern',
                    type: 'error',
                    onClose: () => setAlert({ open: false }),
                });
                return false;
            }
        }
        // reload plan data
        await mutateGetPlanById();
        // reset formstate.isdirty after save
        // TODO is this still required since we reset after setPlanerData()?!?
        methods.reset({}, { keepValues: true });
        return true;
    };

    // handler after we clicked "Weiter" in unsaved/invalid data PopUp
    const handlePopupContinue = async () => {
        if (popUp.continueLink && popUp.continueLink != '') {
            if (!popUp.continueLink.startsWith('/ve-designer')) {
                // release plan if we leave designer
                await dropPlanLock(socket, router.query.plannerId)
                // update all plans SWR to update /plans list
                await router.push({
                    pathname: popUp.continueLink,
                    query: {},
                });
            } else {
                await router.push({
                    pathname: popUp.continueLink,
                    query: popUp.continueLink.startsWith('/ve-designer')
                        ? { plannerId: router.query.plannerId }
                        : {},
                });
            }
        } else {
            setPopUp((prev) => ({ ...prev, isOpen: false, type: undefined }));
            setLoading(false);
        }
    };

    const Breadcrumb = () => {
        if (!plan || !plan.steps) return <></>;
        const mainMenuItem = mainMenu.find((a) => a.id == stageInMenu);
        let subMenuItem = mainMenuItem?.submenu.find((a) => a.link == currentPath);

        if (stageInMenu == 'steps') {
            const currentStep = plan.steps.find((a) =>
                currentPath.endsWith(encodeURIComponent(a.name))
            );

            subMenuItem = currentStep
                ? {
                      id: currentStep.name.toLowerCase(),
                      text: currentStep.name,
                      link: `/ve-designer/step-data/${encodeURIComponent(currentStep.name)}`,
                  }
                : undefined;
        }

        return (
            <div className="text-normale py-2 flex items-center text-slate-500">
                <MdArrowForwardIos size={15} /> {mainMenuItem?.text}
                {subMenuItem && 'text' in subMenuItem && (
                    <>
                        <MdArrowForwardIos size={15} /> {subMenuItem.text}
                    </>
                )}
            </div>
        );
    };

    // häh: if we use this with ref for main return we will have bug #295 (lose focus in 1th type)
    const WrapperBox = ({ children }: { children: JSX.Element }) => (
        <div className="bg-pattern-left-blue bg-no-repeat">
            <Container>
                <WhiteBox>{children}</WhiteBox>
            </Container>
        </div>
    );

    const BackToStart = () => (
        <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
            <Link href="/plans">Zurück zur Übersichtsseite</Link>
        </button>
    );

    if (error) {
        let errorMessage: string;
        switch (error.apiResponse.reason) {
            case 'plan_doesnt_exist':
                errorMessage = 'Dieser Plan wurde nicht gefunden.';
                break;
            case 'insufficient_permission':
                errorMessage = 'Sie haben keine Berechtigung, um diesen Plan zu öffnen.';
                break;
            default:
                errorMessage = 'Ein Fehler ist aufgetreten. Siehe Konsole für Details.';
        }
        return (
            <WrapperBox>
                <div className="flex items-center">
                    <GiSadCrab size={60} className="m-4" />
                    <div className="text-xl text-slate-900">{errorMessage}</div>
                    <BackToStart />
                </div>
            </WrapperBox>
        );
    }

    return (
        <div className="bg-pattern-left-blue bg-no-repeat" ref={wrapperRef}>
            <Container>
                <WhiteBox>
                    <div className="flex flex-col">
                        <Alert state={alert} />
                        <FormProvider {...methods}>
                            {/* TODO implement an PopUp alternative for invalid data */}
                            <PopupSaveData
                                isOpen={popUp.isOpen}
                                type={popUp.type}
                                handleContinue={async () => {
                                    await handlePopupContinue();
                                }}
                                handleCancel={() => {
                                    setPopUp((prev) => {
                                        return { ...prev, isOpen: false, type: undefined };
                                    });
                                    setLoading(false);
                                }}
                            />

                            <Header
                                socket={socket}
                                methods={methods}
                                plan={plan}
                                submitCallback={async (data) => {
                                    const res = await handleSubmit(data);
                                    if (res) {
                                        setAlert({
                                            message: 'Gespeichert',
                                            autoclose: 2000,
                                            onClose: () => setAlert({ open: false }),
                                        });
                                    }
                                }}
                                handleUnsavedData={(data: any, continueLink: string) => {
                                    setPopUp({ isOpen: true, continueLink });
                                }}
                                handleInvalidData={(data: any, continueLink: string) => {
                                    setPopUp({ isOpen: true, type: "invalid", continueLink });
                                }}
                            />

                            <div className="flex flex-row divide-x gap-1">
                                <Sidebar
                                    methods={methods}
                                    submitCallback={async (data) => {
                                        await handleSubmit(data);
                                    }}
                                    handleInvalidData={(data: any, continueLink: string) => {
                                        setPopUp({ isOpen: true, type: "invalid", continueLink });
                                    }}
                                    stageInMenu={stageInMenu}
                                    plan={plan}
                                />

                                <form className="relative w-full px-6 pt-1 max-w-screen-2xl flex flex-col gap-x-4">
                                    <Breadcrumb />

                                    <div className={'flex justify-between items-start mt-2 mb-2'}>
                                        <h2 className="font-bold text-2xl">{title}</h2>
                                        {typeof tooltip !== 'undefined' && (
                                            <Tooltip tooltipsText={tooltip.text}>
                                                <Link
                                                    target="_blank"
                                                    href={tooltip.link}
                                                    className="rounded-full shadow hover:bg-gray-50 p-2 mx-2"
                                                >
                                                    <PiBookOpenText
                                                        size={30}
                                                        color="#00748f"
                                                        className="inline relative"
                                                    />
                                                </Link>
                                            </Tooltip>
                                        )}
                                    </div>
                                    {typeof subtitle !== 'undefined' && (
                                        <p className="text-xl text-slate-600">{subtitle}</p>
                                    )}
                                    {typeof description !== 'undefined' && (
                                        <>
                                            {typeof description === 'string' && (
                                                <p className="mb-8">{description}</p>
                                            )}
                                            {Array.isArray(description) && (
                                                <div className="mb-8">
                                                    {description.map((description, index) => (
                                                        <p key={index} className="mb-2">
                                                            {description}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {loading && (
                                        <>
                                            <div className="absolute w-full h-full -ml-6 bg-slate-50/75 blur-lg"></div>
                                            <div className="absolute left-1/2 translate-x-1/2 top-10">
                                                <LoadingAnimation />
                                            </div>
                                        </>
                                    )}

                                    {children}

                                    {(typeof prevpage !== 'undefined' ||
                                        typeof nextpage !== 'undefined') && (
                                        <div className="my-8 border-t py-3 flex justify-between">
                                            <div>
                                                {typeof prevpage !== 'undefined' && (
                                                    <button
                                                        type="button"
                                                        title="Speichern & zurück"
                                                        className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                                                        onClick={methods.handleSubmit(
                                                            // valid
                                                            async (data: any) => {
                                                                await handleSubmit(data);
                                                                await router.push({
                                                                    pathname: prevpage,
                                                                    query: {
                                                                        plannerId:
                                                                            router.query.plannerId,
                                                                    },
                                                                });
                                                            },
                                                            // invalid
                                                            async (data: any) => {
                                                                setPopUp({
                                                                    isOpen: true,
                                                                    type: "invalid",
                                                                    continueLink: prevpage,
                                                                });
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
                                                        title='Speichern & Weiter'
                                                        className="px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                                                        onClick={methods.handleSubmit(
                                                            // valid
                                                            async (data: any) => {
                                                                await handleSubmit(data);
                                                                await router.push({
                                                                    pathname: nextpage,
                                                                    query: {
                                                                        plannerId:
                                                                            router.query.plannerId,
                                                                    },
                                                                });
                                                            },
                                                            // invalid
                                                            async () => {
                                                                setPopUp({
                                                                    isOpen: true,
                                                                    type: "invalid",
                                                                    continueLink: nextpage,
                                                                });
                                                            }
                                                        )}
                                                    >
                                                        Speichern & Weiter
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
