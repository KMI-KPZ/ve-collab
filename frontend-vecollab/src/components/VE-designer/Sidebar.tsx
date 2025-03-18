import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
    ProgressState,
    ISubmenuData,
    ISideProgressBarStates,
    IMenuData,
    ISideProgressBarStateSteps,
} from '@/interfaces/ve-designer/sideProgressBar';
import { IMainMenuItems, IMenuDataState, mainMenuData } from '@/data/sideMenuSteps';
import { UseFormReturn } from 'react-hook-form';
import { MdArrowDropDown, MdArrowRight, MdMenu } from 'react-icons/md';
import { usePathname } from 'next/navigation';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { useTranslation } from 'next-i18next';
import { HiOutlineCheckCircle } from 'react-icons/hi';
import { is } from 'date-fns/locale';
import Dropdown from '../common/Dropdown';

interface Props {
    methods: UseFormReturn<any>;
    submitCallback: (data: any) => Promise<void>;
    handleInvalidData: (data: any, continueLink: string) => void;
    stageInMenu: keyof IMainMenuItems;
    plan: IPlan;
    progressOfPlan: ISideProgressBarStates | undefined;
    isNoAuthPreview?: boolean;
}

export default function Sidebar({
    methods,
    submitCallback,
    handleInvalidData,
    stageInMenu = 'generally',
    plan,
    progressOfPlan,
    isNoAuthPreview = false,
}: Props): JSX.Element {
    const router = useRouter();
    const currentPath = usePathname();
    const { t } = useTranslation('common');

    const SESS_DESIGNER_MENU_STATE = 'designer_menu_state';

    // get may prev stored menu state from session cookie
    const sessMenuState: IMenuDataState[] =
        sessionStorage.getItem(SESS_DESIGNER_MENU_STATE) !== null
            ? JSON.parse(sessionStorage.getItem(SESS_DESIGNER_MENU_STATE) as string)
            : [];

    // initial menu state (may from session)
    const [menuStates, setMenuStates] = useState<IMenuDataState[]>(
        sessMenuState.length
            ? sessMenuState
            : Object.keys(mainMenuData).map((a) => ({
                  id: mainMenuData[a as keyof IMainMenuItems].id,
                  open: true,
              }))
    );

    const updateMenuState = (id: string, state: boolean) => {
        const _menuStates = menuStates.map((a) => ({
            id: a.id,
            open: a.id == id ? state : a.open,
        }));
        setMenuStates(_menuStates);
        sessionStorage.setItem(SESS_DESIGNER_MENU_STATE, JSON.stringify(_menuStates));
    };

    const [mainMenuData_, setMainMenuData_] = useState<IMainMenuItems>(mainMenuData);

    useEffect(() => {
        if (isNoAuthPreview) return;

        if (!plan?.steps) return;

        const userDefinedSteps = plan.steps.map((step) => {
            return {
                text: step.name,
                id: step._id!,
                link: `/ve-designer/step/${step._id}`,
            };
        });
        if (!userDefinedSteps.length) return;

        const defaultSteps = mainMenuData.steps.submenu || [];

        setMainMenuData_((prev) => {
            const steps = { ...prev.steps, ...{ submenu: [...defaultSteps, ...userDefinedSteps] } };
            return { ...prev, ...{ steps } };
        });
    }, [plan, isNoAuthPreview]);

    const getProgressState = (id: string, parentId: string): any => {
        if (isNoAuthPreview) return undefined;

        if (!progressOfPlan) return undefined;

        const progress =
            parentId == 'steps' && id !== 'stepsGenerally'
                ? progressOfPlan.steps.find((a) => a[id as keyof ISideProgressBarStateSteps])?.[id]
                : progressOfPlan[id as keyof ISideProgressBarStates];

        return progress || undefined;
    };

    const handleClick = (item: ISubmenuData, e: React.BaseSyntheticEvent<any> | undefined) => {
        if (isNoAuthPreview) return;

        if (item.link == currentPath) return;

        methods.handleSubmit(
            // valid
            async (data: any) => {
                await submitCallback(data);
                await router.push({
                    pathname: item.link,
                    query: { plannerId: router.query.plannerId },
                });
            },
            // invalid
            async (data: any) => {
                handleInvalidData(data, item.link);
            }
        )(e);
    };

    const SubMenuItem = ({ item, parentId }: { item: ISubmenuData; parentId: string }) => {
        const isCurrentPage = currentPath == item.link;
        const itemsProgress = getProgressState(item.id, parentId);

        return (
            <button
                type="button"
                onClick={(e) => handleClick(item, e)}
                className={`flex justify-between p-2 w-full cursor-pointer`}
                disabled={isNoAuthPreview}
            >
                <p
                    className={`text-left text-sm font-konnect ${
                        isCurrentPage ? 'text-ve-collab-blue font-extrabold' : ''
                    }`}
                >
                    {t(item.text)}
                </p>
                <span>
                    {/* {itemsProgress == ProgressState.completed && <MdCheckCircleOutline size={20} />} */}
                    {/* {itemsProgress == ProgressState.notStarted && <MdOutlineCircle size={20} />} */}
                    {/* {itemsProgress == ProgressState.uncompleted && <HiOutlineDotsCircleHorizontal className='text-slate-600' size={20} />} */}
                    {itemsProgress == ProgressState.completed && <HiOutlineCheckCircle size={20} />}
                </span>
            </button>
        );
    };

    const MainMenuItem = ({ item }: { item: IMenuData }) => {
        const prevOpenState = menuStates.find((a) => a.id == item.id)?.open;
        const [openSubmenu, setOpenSubmenu] = useState<boolean>(
            typeof prevOpenState !== 'undefined' ? prevOpenState : true
        );
        const isCurrentPage = item.id == stageInMenu;

        return (
            <>
                <div
                    className={`flex bg-white p-2 w-full align-middle items-center ${
                        isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                    }`}
                    onClick={(e) => {
                        if (isNoAuthPreview) return;

                        if (item.submenu.length > 0) {
                            setOpenSubmenu((prev) => {
                                updateMenuState(item.id, !prev);
                                return !prev;
                            });
                        } else {
                            handleClick(item, e);
                        }
                    }}
                >
                    <span
                        className={`w-10 h-10 border-4 rounded-full text-lg flex items-center justify-center ${
                            isCurrentPage ? 'border-ve-collab-blue' : 'border-gray-200'
                        }`}
                    >
                        <Image src={item.image} alt={`${item.text} logo`}></Image>
                    </span>
                    <span
                        className={`ml-3 text-left font-konnect ${
                            isCurrentPage ? 'font-bold' : ''
                        }`}
                    >
                        {t(item.text)}
                    </span>
                    {item.submenu.length > 0 && (
                        <>
                            {openSubmenu ? (
                                <MdArrowDropDown size={20} />
                            ) : (
                                <MdArrowRight size={20} />
                            )}
                        </>
                    )}
                </div>
                {item.submenu.length > 0 && openSubmenu ? (
                    <ul className="flex flex-col divide-y divide-gray-200 gap-1 bg-white ml-6">
                        {item.submenu.map((subItem, subIndex) => {
                            return (
                                <li key={subIndex}>
                                    <SubMenuItem item={subItem} parentId={item.id} />
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <></>
                )}
            </>
        );
    };

    return (
        <>
            {/* desktop navigation */}
            <nav className="hidden md:block flex flex-col text-center w-80 mb-3 bg-white rounded-xl">
                <ul className="flex flex-col divide-y divide-gray-200 gap-1 bg-white">
                    {Object.keys(mainMenuData_).map((el, i) => (
                        <li key={i}>
                            <MainMenuItem item={mainMenuData_[el as keyof IMainMenuItems]} />
                        </li>
                    ))}
                </ul>
            </nav>

            {/* stacked mobile sandwich navigation */}
            <Dropdown
                options={[
                    <ul className="flex flex-col divide-y divide-gray-200 gap-1 bg-white" key={0}>
                        {Object.keys(mainMenuData_).map((el, i) => (
                            <li key={i}>
                                <MainMenuItem item={mainMenuData_[el as keyof IMainMenuItems]} />
                            </li>
                        ))}
                    </ul>,
                ]}
                icon={
                    <div className="absolute rounded-md shadow border border-gray-200 h-[41px] w-[41px] -mt-[8px] flex justify-center items-center">
                        <MdMenu size={25} className="inline-block" />
                    </div>
                }
                wrapperClassNames="!absolute h-full z-10 md:hidden"
                ulClasses="absolute min-w-[15rem] h-fit max-h-[calc(100%-41px)] !left-[8px] !top-[50px] overflow-y-scroll"
            />
        </>
    );
}
