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
import { IMenuDataState, mainMenu } from '@/data/sideMenuSteps';
import { UseFormReturn } from 'react-hook-form';
import { MdArrowDropDown, MdArrowRight, MdCheckCircleOutline } from 'react-icons/md';
import { usePathname } from 'next/navigation';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { useTranslation } from 'next-i18next';

interface Props {
    methods: UseFormReturn<any>;
    submitCallback: (data: any) => Promise<void>;
    handleInvalidData: (data: any, continueLink: string) => void;
    stageInMenu: string;
    plan: IPlan;
}

export default function Sidebar({
    methods,
    submitCallback,
    handleInvalidData,
    stageInMenu = 'generally',
    plan,
}: Props): JSX.Element {
    const router = useRouter();
    const currentPath = usePathname();
    const { t } = useTranslation('common');

    // init menu open states
    let menuStates: IMenuDataState[] = mainMenu(t).map((a) => {
        return { id: a.id, open: true };
    });

    // note: but why does this work while change a route?!
    //  because we actually do not reload the page
    const updateMenuState = (id: string, state: boolean) => {
        menuStates = menuStates.map((a) => ({
            id: a.id,
            open: a.id == id ? state : a.open,
        }));
    };

    const [mainMenuData, setMainMenuData] = useState<IMenuData[]>(mainMenu(t));

    useEffect(() => {
        if (!plan?.steps || !mainMenu?.length) return;

        const userDefinedSteps = plan.steps.map((step) => {
            return {
                text: step.name,
                id: encodeURI(step.name),
                link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
            };
        });
        if (!userDefinedSteps.length) return;

        const defaultSteps = mainMenu(t).find((a) => a.id == 'steps')?.submenu || [];

        // adding user defined steps to steps menu item
        setMainMenuData((prev) => {
            return prev.map((item) => {
                if (item.id == 'steps') {
                    return Object.assign({}, item, {
                        submenu: [...defaultSteps, ...userDefinedSteps],
                    });
                } else {
                    return item;
                }
            });
        });
    }, [plan]);

    const getProgressState = (id: string, parentId: string): any => {
        if (!plan || !plan.progress) return ProgressState.notStarted;

        const progress =
            parentId == 'steps' && id !== 'stepsGenerally'
                ? plan.progress.steps.find((a) => a[id as keyof ISideProgressBarStateSteps])?.[id]
                : plan.progress[id as keyof ISideProgressBarStates];

        if (progress !== undefined) return progress;

        return ProgressState.notStarted;
    };

    const handleClick = (item: ISubmenuData, e: React.BaseSyntheticEvent<any> | undefined) => {
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

        return (
            <button
                type="button"
                onClick={(e) => handleClick(item, e)}
                className={`flex justify-between p-2 w-full`}
            >
                <p
                    className={`text-left text-sm font-konnect ${
                        isCurrentPage ? 'text-ve-collab-blue font-extrabold' : ''
                    }`}
                >
                    {item.text}
                </p>
                <span>
                    {getProgressState(item.id, parentId) == ProgressState.completed && (
                        <MdCheckCircleOutline size={20} />
                    )}
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
                    className="flex bg-white p-2 w-full align-middle items-center cursor-pointer"
                    onClick={(e) => {
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
                            isCurrentPage ? 'border-ve-collab-blue' : ''
                        }`}
                    >
                        <Image src={item.image} alt={`${item.text} logo`}></Image>
                    </span>
                    <span
                        className={`ml-3 text-left font-konnect ${
                            isCurrentPage ? 'font-bold' : ''
                        }`}
                    >
                        {item.text}
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
                    <ul className="flex flex-col divide-y gap-1 bg-white ml-6">
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
            <nav className="flex flex-col text-center w-80 mb-3 bg-white rounded-xl">
                <ul className="flex flex-col divide-y gap-1 bg-white">
                    {mainMenuData.map((item, index) => (
                        <li key={index}>
                            <MainMenuItem item={item} />
                        </li>
                    ))}
                </ul>
            </nav>
        </>
    );
}
