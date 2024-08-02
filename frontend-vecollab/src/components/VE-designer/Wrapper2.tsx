import React, { useEffect, useRef, useState } from 'react';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchPOST } from '@/lib/backend';
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
import usePlaner from '@/lib/usePlaner';
import useUpdatePlaner from '@/lib/useUpdatePlaner';

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
    planerDataCallback: (data: any) => void;
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
    const currentPath = usePathname();
    const { data: session } = useSession();

    const [popUp, setPopUp] = useState<{ isOpen: boolean; continueLink: string }>({
        isOpen: false,
        continueLink: '/plans',
    });
    const wrapperRef = useRef<null | HTMLDivElement>(null);
    const [alert, setAlert] = useState<AlertState>({ open: false });

    const planerQuery = usePlaner(router.query.plannerId as string);
    const updatePlanerMutation = useUpdatePlaner();

    // set data in the planDataCallback for the children
    useEffect(() => {
        if (planerQuery.data !== undefined) {
            planerDataCallback(planerQuery.data);
        }
    }, [planerDataCallback, planerQuery.data]);

    // detect window close or a click outside of planer
    // TODO submit + route + success notification, if validation error -> window unsaved data
    useEffect(() => {
        let clickedOutside: boolean = false;
        const handleClickOutside = (e: MouseEvent) => {
            clickedOutside = !wrapperRef?.current?.contains(e.target as Node) || false;
        };

        const handleBrowseAway = async (nextlink: string) => {
            if (clickedOutside && preventToLeave) {
                console.log(nextlink);
                await methods.handleSubmit(
                    // valid form
                    async (data: any) => {
                        await handleSubmit(data);
                        return true;
                    },
                    // invalid form
                    async (data: any) => {
                        //TODO interrupt route call -> popup // nothing works to interrupt call
                        router.events.emit('routeChangeError');
                        /*setPopUp({ isOpen: true, continueLink: nextlink });*/
                        throw 'routeChange aborted.';
                    }
                )(); // outside of a form only returns a function -> handleSubmit(onSubmit)()
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
    }, [methods.handleSubmit, preventToLeave, router.events]);

    // check access rights or locked plan
    // TODO why to useEffects to check access rights?
    useEffect(() => {
        if (!session) return;

        if (!router.query.plannerId) {
            router.push('/plans');
            return;
        }

        socket.emit(
            'try_acquire_or_extend_plan_write_lock',
            { plan_id: router.query.plannerId },
            async (response: any) => {
                if (response.success === true && response.status !== 403) {
                    return;
                }
                if (response.reason === 'plan_locked') {
                    const data = await fetchPOST(
                        '/profile_snippets',
                        { usernames: [response.lock_holder] },
                        session?.accessToken
                    );
                    const userSnippet = data.user_snippets.find(
                        (snippet: BackendUserSnippet) => snippet.username === response.lock_holder
                    );
                    const displayName = userSnippet
                        ? `${userSnippet.first_name} ${userSnippet.last_name}`
                        : response.lock_holder;
                    setAlert({
                        message: `Plan wird gerade von ${displayName} bearbeitet. Änderungen werden nicht gespeichert!`,
                        autoclose: 10000,
                        onClose: () => setAlert({ open: false }),
                    });
                    return;
                }
                if (!response.success && response.status === 401) {
                    // TODO handle re-authenticate
                }
                // show "Plan not found" message instead (see bottom)
                // router.push('/plans')
            }
        );
    }, [router, session, socket]);

    // write access check
    useEffect(() => {
        if (
            planerQuery.data?.write_access?.includes(session?.user?.preferred_username!) &&
            planerQuery.data?.author !== session?.user?.preferred_username!
        ) {
            setAlert({
                message: 'Sie haben keine Berechtigung, um diesen Plan zu bearbeiten.',
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
        }
    }, [
        planerQuery.data?.author,
        planerQuery.data?.write_access,
        session?.user?.preferred_username,
    ]);

    const handleSubmit = async (data: any) => {
        const fields = await submitCallback(data);

        if (fields) {
            updatePlanerMutation.mutate(fields);
        }
    };

    const handlePopupContinue = async () => {
        const { continueLink } = popUp;
        const { plannerId } = router.query;
        if (!continueLink && !plannerId) {
            setPopUp((prev) => ({ ...prev, isOpen: false }));
            return;
        }

        if (continueLink.startsWith('/ve-designer')) {
            socket.emit('drop_plan_lock', { plan_id: plannerId }, async (response: any) => {
                // TODO: Handle errors if needed
                await router.push({ pathname: continueLink });
            });
        } else {
            await router.push({ pathname: continueLink, query: { plannerId: plannerId } });
        }
    };

    const Breadcrumb = () => {
        if (!planerQuery.data || !planerQuery.data.steps) return <></>;
        const mainMenuItem = mainMenu.find((a) => a.id == stageInMenu);
        let subMenuItem = mainMenuItem?.submenu.find((a) => a.link == currentPath);

        if (stageInMenu == 'steps') {
            const currentStep = planerQuery.data.steps.find((a) =>
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

    if (planerQuery.error) {
        // TODO error messages
        /*let errorMessage: string;
        switch (planerQuery.error.) {
            case 'plan_doesnt_exist':
                errorMessage = 'Dieser Plan wurde nicht gefunden.';
                break;
            case 'insufficient_permission':
                errorMessage = 'Sie haben keine Berechtigung, um diesen Plan zu öffnen.';
                break;
            default:
                errorMessage = 'Ein Fehler ist aufgetreten. Siehe Konsole für Details.';
        }*/
        return (
            <WrapperBox>
                <div className="flex items-center">
                    <GiSadCrab size={60} className="m-4" />
                    <div className="text-xl text-slate-900">{planerQuery.error.message}</div>
                    <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
                        <Link href="/plans">Zurück zur Übersichtsseite</Link>
                    </button>
                </div>
            </WrapperBox>
        );
    }

    // if (
    //     planerQuery.isLoading ||
    //     planerQuery.isFetching ||
    //     !planerQuery.data ||
    //     !router.query.plannerId
    // ) {
    //     return (
    //         <WrapperBox>
    //             <LoadingAnimation />
    //         </WrapperBox>
    //     );
    // }

    return (
        <div className="bg-pattern-left-blue bg-no-repeat" ref={wrapperRef}>
            <Container>
                <WhiteBox>
                    <div className="flex flex-col">
                        <Alert state={alert} />
                        <FormProvider {...methods}>
                            {/* TODO implement an PopUp alternative or invalid data */}
                            <PopupSaveData
                                isOpen={popUp.isOpen}
                                handleContinue={async () => {
                                    await handlePopupContinue();
                                }}
                                handleCancel={() => {
                                    setPopUp((prev) => {
                                        return { ...prev, isOpen: false };
                                    });
                                }}
                            />

                            <Header
                                socket={socket}
                                methods={methods}
                                plan={planerQuery!.data!}
                                submitCallback={async (data) => {
                                    handleSubmit(data).then(() => {
                                        setAlert({
                                            message: 'Gespeichert',
                                            autoclose: 2000,
                                            onClose: () => setAlert({ open: false }),
                                        });
                                    });
                                }}
                                handleUnsavedData={(data: any, continueLink: string) => {
                                    setPopUp({ isOpen: true, continueLink: continueLink });
                                }}
                                handleInvalidData={(data: any, continueLink: string) => {
                                    // setPopUp({ isOpen: true, type: "invalid", continueLink });
                                }}
                            />

                            <div className="flex flex-row divide-x gap-1">
                                <Sidebar
                                    methods={methods}
                                    submitCallback={async (data) => {
                                        await handleSubmit(data);
                                    }}
                                    handleInvalidData={(data: any, continueLink: string) => {
                                        setPopUp({ isOpen: true, continueLink: continueLink });
                                    }}
                                    stageInMenu={stageInMenu}
                                    plan={planerQuery!.data!}
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

                                    {(planerQuery.isLoading || planerQuery.isFetching) && (
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
                                            <div className="basis-20">
                                                {typeof prevpage !== 'undefined' && (
                                                    <button
                                                        type="button"
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
                                                                    continueLink: prevpage,
                                                                });
                                                            }
                                                        )}
                                                    >
                                                        Zurück
                                                    </button>
                                                )}
                                            </div>

                                            <div className="basis-44">
                                                {typeof nextpage !== 'undefined' && (
                                                    <button
                                                        type="button"
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
