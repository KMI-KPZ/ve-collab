import React, { useEffect, useRef, useState } from 'react';
import { FieldValues, FormProvider, UseFormReturn } from 'react-hook-form';
import { fetchPOST, useGetPlanById } from '@/lib/backend';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '../common/LoadingAnimation';
import PopupSaveData from './PopupSaveData';
import WhiteBox from '../common/WhiteBox';
import { MdArrowForwardIos, MdOutlineCircle } from 'react-icons/md';
import Header from './Header';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import { IMainMenuItems, mainMenuData } from '@/data/sideMenuSteps';
import { Tooltip } from '../common/Tooltip';
import { PiBookOpenText } from 'react-icons/pi';
import Link from 'next/link';
import Alert, { AlertState } from '../common/dialogs/Alert';
import { Socket } from 'socket.io-client';
import { BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { GiSadCrab } from 'react-icons/gi';
import { dropPlanLock, getPlanLock } from './PlanSocket';
import { useTranslation } from 'next-i18next';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ISideProgressBarStateSteps,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { HiOutlineCheckCircle } from 'react-icons/hi';

interface Props {
    title: string;
    subtitle?: string;
    description?: JSX.Element | string[] | string;
    tooltip?: { text: string; link: string };
    methods: UseFormReturn<any>;
    children: React.ReactNode;
    prevpage?: string;
    prevPageBtnLabel?: string;
    nextpage?: string;
    nextpageBtnLabel?: string;
    preventToLeave?: boolean;

    stageInMenu?: keyof IMainMenuItems;
    idOfProgress?: string | keyof ISideProgressBarStates;
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
    socket?: Socket;
    isNoAuthPreview?: boolean;
}

export default function Wrapper({
    title,
    subtitle,
    description,
    tooltip,
    children,
    methods,
    prevpage,
    prevPageBtnLabel,
    nextpage,
    nextpageBtnLabel,
    stageInMenu = 'generally',
    idOfProgress,
    preventToLeave = true,
    planerDataCallback,
    submitCallback,
    socket,
    isNoAuthPreview = false,
}: Props): JSX.Element {
    const router = useRouter();
    const { data: session } = useSession();
    const { t } = useTranslation(['designer', 'common']);

    const [loading, setLoading] = useState(true);
    const [formDataLoaded, setFormDataLoaded] = useState<boolean>(false);
    const [popUp, setPopUp] = useState<{
        isOpen: boolean;
        continueLink: string;
        type?: 'unsaved' | 'invalid';
    }>({
        isOpen: false,
        continueLink: '/plans',
    });
    const wrapperRef = useRef<null | HTMLDivElement>(null);
    const [alert, setAlert] = useState<AlertState>({ open: false });
    const currentPath = usePathname();

    const [progressOfCurrent, setProgressOfCurrent] = useState<ProgressState>(
        ProgressState.notStarted
    );
    const [progressOfPlan, setProgressOfPlan] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    // fetch plan
    const {
        data: plan,
        isLoading,
        error,
        mutate: mutateGetPlanById,
    } = useGetPlanById(
        router.query.plannerId as string,
        !isNoAuthPreview && router.query.plannerId !== undefined
    );

    // detect window close or a click outside of planer
    useEffect(() => {
        if (isNoAuthPreview) return;

        if (!router.isReady) return;
        if (!router.query.plannerId) return;
        let clickedOutside: boolean = false;

        const handleClickOutside = (e: MouseEvent) => {
            clickedOutside = !wrapperRef?.current?.contains(e.target as Node) || false;
        };

        const handleBrowseAway = (nextlink: string) => {
            if (preventToLeave === false) return;

            if (clickedOutside) {
                if (Object.keys(methods.formState.dirtyFields).length == 0) {
                    dropPlanLock(socket!, router.query.plannerId as string);
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
    }, [wrapperRef, methods, socket, router, preventToLeave, isNoAuthPreview]);

    // check access rights or locked plan
    useEffect(() => {
        if (isNoAuthPreview) return;

        if (isLoading || !session || error) return;
        if (!router.query.plannerId) return;

        getPlanLock(socket!, router.query.plannerId).catch((response) => {
            if (response.reason === 'plan_locked') {
                // const data = await
                fetchPOST(
                    '/profile_snippets',
                    { usernames: [response.lock_holder] },
                    session?.accessToken
                ).then((data) => {
                    const userSnippet = data.user_snippets.find(
                        (snippet: BackendUserSnippet) => snippet.username === response.lock_holder
                    );
                    const displayName = userSnippet
                        ? `${userSnippet.first_name} ${userSnippet.last_name}`
                        : response.lock_holder;
                    setAlert({
                        message: t('alert_locked', { name: displayName }),
                        // autoclose: 10000,
                        type: 'warning',
                        onClose: () => setAlert({ open: false }),
                    });
                });
            }
        });

        // write access or author check
        if (
            !plan.write_access.includes(session?.user.preferred_username!) &&
            plan.author.username !== session?.user.preferred_username!
        ) {
            setAlert({
                message: t('alert_insufficient_permission'),
                type: 'error',
                onClose: () => setAlert({ open: false }),
            });
        }
    }, [plan, isLoading, error, socket, router, session, t, isNoAuthPreview]);

    // call data callback and rest form defaults for correct form valdation (form.isDirty)
    useEffect(() => {
        if (isNoAuthPreview) return;

        if (!router.isReady || isLoading || error) return;
        if (!router.query.plannerId) {
            // remove loader for blank new plan
            setLoading(false);
            return;
        }

        let willRouteChange: boolean = false;

        const getProgressOfCurrentStep = (planProgress: ISideProgressBarStates) => {
            if (!idOfProgress) return undefined;

            const progress =
                stageInMenu == 'steps' && idOfProgress != 'stepsGenerally'
                    ? planProgress.steps.find(
                          (a) => a[idOfProgress as keyof ISideProgressBarStateSteps]
                      )?.[idOfProgress]
                    : planProgress[idOfProgress as keyof Omit<ISideProgressBarStates, 'steps'>];

            return progress;
        };

        (async () => {
            // hotfix: only reset form if not already done
            //  otherwise we loose changes in <Select />-Components on browser tab-change (see #549)
            if (!formDataLoaded) {
                const data = await planerDataCallback(plan);
                if (Object.keys(data).length) {
                    // reset form default values for isDirty check
                    methods.reset(data);
                }
                setFormDataLoaded(true);
            }
            if (idOfProgress) {
                const progress = getProgressOfCurrentStep(plan.progress);
                setProgressOfPlan(plan.progress);
                if (progress) setProgressOfCurrent(progress);
            }

            // fix: do not remove loader if we'll change the route
            setTimeout(() => {
                if (!willRouteChange) setLoading(false);
            }, 1);
        })();

        const handleRouteChange = (url: string) => (willRouteChange = true);

        router.events.on('routeChangeStart', handleRouteChange);
        return () => {
            router.events.off('routeChangeStart', handleRouteChange);
        };
    }, [
        router,
        plan,
        isLoading,
        error,
        formDataLoaded,
        planerDataCallback,
        stageInMenu,
        idOfProgress,
        methods,
        isNoAuthPreview,
    ]);

    const createNewPlan = async (name: string): Promise<string> => {
        const newPlanner = await fetchPOST(
            '/planner/insert_empty',
            { name: name.length > 0 ? name : t('default_new_plan_name') },
            session?.accessToken
        );

        if (!newPlanner.inserted_id) return Promise.reject(false);

        return new Promise((resolve, reject) => {
            getPlanLock(socket!, newPlanner.inserted_id)
                .then((response) => {
                    resolve(newPlanner.inserted_id);
                })
                .catch((response) => {
                    reject(false);
                });
        });
    };

    // submit formdata & reload plan
    const handleSubmit = async (data: any) => {
        if (isNoAuthPreview) return;

        setLoading(true);
        const fields = (await submitCallback(data)) as {
            plan_id: string;
            field_name: string;
            value: any;
        }[];

        let plannerId = router.query.plannerId;

        if (!router.query.plannerId) {
            const newName = fields.find((a) => a.field_name == 'name')?.value;
            const newPlanId = await createNewPlan(newName !== undefined ? newName : '');

            if (!newPlanId) {
                setAlert({
                    message: t('alert_error_save'),
                    type: 'error',
                    onClose: () => {
                        setAlert({ open: false });
                        setLoading(false);
                    },
                });
                return;
            }
            plannerId = newPlanId;
            fields.map((field) => {
                field.plan_id = plannerId as string;
                return field;
            });

            router.query.plannerId = newPlanId;
            await router.replace({
                query: { plannerId: newPlanId },
            });
        }

        if (fields && Object.keys(fields).length > 0) {
            if (typeof idOfProgress === 'string') {
                fields.push({
                    plan_id: plannerId as string,
                    field_name: 'progress',
                    value: progressOfPlan,
                });
            }

            const res = await fetchPOST(
                '/planner/update_fields',
                { update: fields },
                session?.accessToken
            );
            if (res.success === false) {
                setAlert({
                    message: t('alert_error_save'),
                    type: 'error',
                    onClose: () => {
                        setAlert({ open: false });
                        setLoading(false);
                    },
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
        if (isNoAuthPreview) return;

        if (popUp.continueLink && popUp.continueLink != '') {
            // user leaves the designer
            if (!popUp.continueLink.startsWith('/ve-designer')) {
                await dropPlanLock(socket!, router.query.plannerId);
                // update all plans SWR to update /plans list
                await router.push({
                    pathname: popUp.continueLink,
                    query: {},
                });
            } else {
                let plannerId = router.query.plannerId;
                if (!router.query.plannerId) {
                    const newPlanId = await createNewPlan('');
                    if (!newPlanId) {
                        setAlert({
                            message: t('alert_error_save'),
                            type: 'error',
                            onClose: () => {
                                setAlert({ open: false });
                                setLoading(false);
                            },
                        });
                        return;
                    }
                    plannerId = newPlanId;
                }
                // go to next planer-page
                await router.push({
                    pathname: popUp.continueLink,
                    query: { plannerId },
                });
            }
        } else {
            setPopUp((prev) => ({ ...prev, isOpen: false, type: undefined }));
            setLoading(false);
        }
    };

    const handleClickToggleProgress = () => {
        if (isNoAuthPreview) return;

        // let progress = ProgressState.notStarted
        // if (progressOfCurrent == ProgressState.notStarted)
        //     progress = ProgressState.completed
        // else if (progressOfCurrent == ProgressState.completed)
        //     progress = ProgressState.uncompleted

        setProgress(
            progressOfCurrent == ProgressState.notStarted
                ? ProgressState.completed
                : ProgressState.notStarted
        );
    };

    const setProgress = (progress: ProgressState) => {
        if (isNoAuthPreview) return;

        if (!idOfProgress) return;

        if (stageInMenu == 'steps' && idOfProgress != 'stepsGenerally') {
            if (!plan.progress.steps.some((a, i) => idOfProgress in a)) {
                setProgressOfPlan((prev) => {
                    prev.steps.push({ [idOfProgress]: progress });
                    return { ...prev };
                });
            } else {
                setProgressOfPlan((prev) => {
                    const _stepsProgress = prev.steps.map((step) =>
                        step[idOfProgress] !== undefined ? { [idOfProgress]: progress } : step
                    );
                    return { ...prev, ...{ steps: _stepsProgress } };
                });
            }
        } else {
            setProgressOfPlan((prev) => {
                return { ...prev, ...{ [idOfProgress]: progress } };
            });
        }

        setProgressOfCurrent(progress);
    };

    const Breadcrumb = () => {
        if (!plan || !plan.steps) return <></>;
        const mainMenuItem = mainMenuData[stageInMenu];
        let subMenuItem = mainMenuItem.submenu.find((a) => a.link == currentPath);

        if (stageInMenu == 'steps') {
            const currentStep = plan.steps.find((a) => currentPath.endsWith(a._id!));

            subMenuItem = currentStep
                ? {
                      id: currentStep.name.toLowerCase(),
                      text: currentStep.name,
                      link: `/ve-designer/step/${currentStep._id}`,
                  }
                : undefined;
        }

        return (
            <div className="text-normale py-2 flex items-center text-slate-500">
                <MdArrowForwardIos size={15} /> {t(mainMenuItem.text)}
                {subMenuItem && 'text' in subMenuItem && (
                    <>
                        <MdArrowForwardIos size={15} /> {t(subMenuItem.text)}
                    </>
                )}
            </div>
        );
    };

    // häh: if we use this with ref for main return we will have bug #295 (lose focus in 1th type)
    const WrapperBox = ({ children }: { children: JSX.Element }) => <WhiteBox>{children}</WhiteBox>;

    const BackToStart = () => (
        <button className="px-6 py-2 m-4 bg-ve-collab-orange rounded-lg text-white">
            <Link href="/plans">{t('back_to_overview')}</Link>
        </button>
    );

    const SaveAndNextBtn = () => {
        if (nextpage === 'undefined') return <></>;

        return (
            <div className="shadow-sm flex text-white rounded-full ring-4 ring-inset ring-ve-collab-orange/50">
                {typeof idOfProgress !== 'undefined' && (
                    <span
                        className={`group px-4 py-2 flex items-center text-slate-700 ${
                            isNoAuthPreview ? '' : 'hover:cursor-pointer hover:text-slate-900'
                        }`}
                        onClick={(e) => handleClickToggleProgress()}
                    >
                        {t('step_done_question')}

                        <span
                            title={t('toggle_state_hover')}
                            className={`ml-1 ${
                                isNoAuthPreview
                                    ? ''
                                    : 'transition ease-in-out group-hover:scale-110'
                            }`}
                        >
                            {progressOfCurrent == ProgressState.notStarted && (
                                <MdOutlineCircle className="inline mb-1" size={22} />
                            )}
                            {/* {progressOfCurrent == ProgressState.uncompleted && <HiOutlineDotsCircleHorizontal className="inline mb-1" size={22} />} */}
                            {progressOfCurrent == ProgressState.completed && (
                                <HiOutlineCheckCircle className="inline mb-1" size={22} />
                            )}
                        </span>
                    </span>
                )}

                <button
                    type="button"
                    title={t('save_and_continue')}
                    className={`px-4 py-2 shadow text-white bg-ve-collab-orange ${
                        typeof idOfProgress !== 'undefined' ? 'rounded-r-full' : 'rounded-full'
                    } ${isNoAuthPreview ? 'cursor-default' : ''}`}
                    disabled={isNoAuthPreview}
                    onClick={methods.handleSubmit(
                        // valid
                        async (data: any) => {
                            if (isNoAuthPreview) return;

                            await handleSubmit(data);
                            await router.push({
                                pathname: nextpage,
                                query: {
                                    plannerId: router.query.plannerId,
                                },
                            });
                        },
                        // invalid
                        async () => {
                            if (isNoAuthPreview) return;

                            setPopUp({
                                isOpen: true,
                                type: 'invalid',
                                continueLink: nextpage!,
                            });
                        }
                    )}
                >
                    {nextpageBtnLabel || t('save_and_continue')}
                </button>
            </div>
        );
    };

    if (error) {
        let errorMessage: string;
        switch (error.apiResponse.reason) {
            case 'plan_doesnt_exist':
                errorMessage = t('common:plans_alert_doesnt_exist');
                break;
            case 'insufficient_permission':
                errorMessage = t('common:plans_alert_open_insufficient_permission');
                break;
            default:
                errorMessage = t('common:plans_alert_open_unexpected_error');
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

    if (isNoAuthPreview) {
        return (
            <WhiteBox>
                <div className="flex flex-col">
                    <Alert state={alert} />
                    <Header
                        socket={socket}
                        methods={methods}
                        plan={plan}
                        submitCallback={() => {}}
                        handleUnsavedData={() => {}}
                        handleInvalidData={() => {}}
                        isNoAuthPreview={isNoAuthPreview}
                    />

                    <div className="flex flex-row divide-x divide-gray-200 gap-1">
                        <Sidebar
                            methods={methods}
                            submitCallback={async () => {}}
                            handleInvalidData={() => {}}
                            stageInMenu={stageInMenu}
                            plan={plan}
                            progressOfPlan={progressOfPlan}
                            isNoAuthPreview={isNoAuthPreview}
                        />

                        <form
                            className="relative w-full px-6 pt-1 max-w-(--breakpoint-2xl) flex flex-col gap-x-4"
                            onSubmit={() => {}}
                        >
                            <Breadcrumb />

                            <div className={'flex justify-between items-start mt-2 mb-2'}>
                                <h2 className="font-bold text-2xl">{title}</h2>
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
                                    {React.isValidElement(description) && <>{description}</>}
                                </>
                            )}

                            {children}

                            {(typeof prevpage !== 'undefined' ||
                                typeof nextpage !== 'undefined') && (
                                <div className="my-8 border-t border-t-gray-200 py-3 flex justify-between">
                                    <div>
                                        {typeof prevpage !== 'undefined' && (
                                            <button
                                                type="button"
                                                title={t('common:back')}
                                                className={`px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange ${
                                                    isNoAuthPreview ? 'cursor-default' : ''
                                                }`}
                                                onClick={() => {}}
                                            >
                                                {prevPageBtnLabel || t('common:back')}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex tex-center">
                                        <SaveAndNextBtn />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </WhiteBox>
        );
    }

    return (
        <div ref={wrapperRef}>
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
                                        type: 'success',
                                        message: t('alert_saved'),
                                        autoclose: 2000,
                                        onClose: () => setAlert({ open: false }),
                                    });
                                }
                            }}
                            handleUnsavedData={(data: any, continueLink: string) => {
                                setPopUp({ isOpen: true, continueLink });
                            }}
                            handleInvalidData={(data: any, continueLink: string) => {
                                console.error(data);
                                setPopUp({ isOpen: true, type: 'invalid', continueLink });
                            }}
                        />

                        <div className="flex flex-row divide-x divide-gray-200 gap-1">
                            <Sidebar
                                methods={methods}
                                submitCallback={async (data) => {
                                    await handleSubmit(data);
                                }}
                                handleInvalidData={(data: any, continueLink: string) => {
                                    console.error(data);
                                    setPopUp({ isOpen: true, type: 'invalid', continueLink });
                                }}
                                stageInMenu={stageInMenu}
                                plan={plan}
                                progressOfPlan={progressOfPlan}
                            />

                            <form
                                className="relative w-full px-6 pt-1 max-w-(--breakpoint-2xl) flex flex-col gap-x-4"
                                onSubmit={methods.handleSubmit(
                                    // valid
                                    async (data: any) => {
                                        await handleSubmit(data);
                                        await router.push({
                                            pathname: nextpage,
                                            query: {
                                                plannerId: router.query.plannerId,
                                            },
                                        });
                                    },
                                    // invalid
                                    async () => {
                                        setPopUp({
                                            isOpen: true,
                                            type: 'invalid',
                                            continueLink: nextpage || '/plans',
                                        });
                                    }
                                )}
                            >
                                <Breadcrumb />

                                <div className={'flex justify-between items-start mt-2 mb-2'}>
                                    <h2 className="font-bold text-2xl">{title}</h2>
                                    {typeof tooltip !== 'undefined' && (
                                        <Tooltip tooltipsText={tooltip.text} position="left">
                                            <Link
                                                target="_blank"
                                                href={tooltip.link}
                                                className="rounded-full shadow-sm hover:bg-gray-50 p-2 mx-2"
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
                                        {React.isValidElement(description) && <>{description}</>}
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
                                    <div className="my-8 border-t border-t-gray-200 py-3 flex justify-between">
                                        <div>
                                            {typeof prevpage !== 'undefined' && (
                                                <button
                                                    type="button"
                                                    title={t('common:back')}
                                                    className="px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
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
                                                                type: 'invalid',
                                                                continueLink: prevpage,
                                                            });
                                                        }
                                                    )}
                                                >
                                                    {prevPageBtnLabel || t('common:back')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex tex-center">
                                            {/* <div className='mx-2 mr-4 px-2 pr-4 text-slate-800 text-sm flex flex-col text-right border-r border-gray-200'>
                                                <span>{t("editing_state")}:</span>

                                                <span className=' hover:cursor-pointer' title={t("toggle_state_hover")} onClick={e => handleClickToggleProgress()}>
                                                    {progressOfCurrent == ProgressState.notStarted && (<>
                                                        <span className='underline underline-offset-2 decoration-dotted italic text-ve-collab-blue'>{t("state_notStarted")}</span>
                                                        <MdOutlineCircle className="inline ml-1 mb-1" size={22} />
                                                    </>)}
                                                    {progressOfCurrent == ProgressState.uncompleted && (<>
                                                        <span className='underline underline-offset-2 decoration-dotted italic text-ve-collab-blue'>{t("state_uncompleted")}</span>
                                                        <HiOutlineDotsCircleHorizontal className="inline ml-1 mb-1" size={22} />
                                                    </>)}
                                                    {progressOfCurrent == ProgressState.completed && (<>
                                                        <span className='underline underline-offset-2 decoration-dotted italic text-ve-collab-blue'>{t("state_completed")}</span>
                                                        <HiOutlineCheckCircle className="inline ml-1 mb-1" size={22} />
                                                    </>)}
                                                </span
                                            </div> */}

                                            <SaveAndNextBtn />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </FormProvider>
                </div>
            </WhiteBox>
        </div>
    );
}
