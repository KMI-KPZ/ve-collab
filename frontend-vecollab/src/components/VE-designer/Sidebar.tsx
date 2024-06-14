import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
    ProgressState,
    ISubmenuData,
    ISideProgressBarStates,
    IMenuData,
} from '@/interfaces/ve-designer/sideProgressBar';
import { mainMenu } from '@/data/sideMenuSteps';
import { UseFormReturn } from 'react-hook-form';
import { MdArrowDropDown, MdArrowRight, MdCheckCircleOutline } from 'react-icons/md';
import { usePathname } from 'next/navigation';
import { useGetPlanById } from '@/lib/backend';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    submitCallback: (data: any) => void,
    handleInvalidData: (data: any, continueLink: string) => void,
    progressState?: ISideProgressBarStates;
    // onSubmit: SubmitHandler<any>;
    stageInMenu: string,
    updateSidebar?: boolean
}

export default function Sidebar({
    methods,
    submitCallback,
    progressState,
    handleInvalidData,
    stageInMenu='generally',
    updateSidebar=false,
    // onSubmit,
}: Props): JSX.Element {
    const router = useRouter();
    // const { handleSubmit } = useFormContext();

    const currentPath = usePathname()
    const { data: plan, isLoading, error, mutate } = useGetPlanById(router.query.plannerId as string);
    const [mainMenuData, setMainMenuData] = useState<IMenuData[]>(mainMenu)

    useEffect(() => {
        if (!plan?.steps || !mainMenu?.length || isLoading) return

        const userDefinedSteps = plan.steps.map(step => { return {
            text: step.name,
            id: step.name.toLowerCase(),
            link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
        }})
        if (!userDefinedSteps.length) return

        const defaultSteps = (mainMenu.find(a => a.id == 'steps')?.submenu) || []

        // adding user defined steps to steps menu item
        setMainMenuData(prev => {
            return prev.map(item => {
                if (item.id == 'steps') {
                    return Object.assign({}, item, {submenu: [...defaultSteps, ...userDefinedSteps]})
                } else {
                    return item
                }
            })
        })

    }, [plan, isLoading])

    useEffect(() => {
        if (updateSidebar === true) {
            mutate()
        }
    }, [updateSidebar, mutate])

    const getProgressState = (id: string): any => {
        const idDecrypted: string = decodeURI(id);
        if (
            progressState !== undefined &&
            progressState[idDecrypted as keyof ISideProgressBarStates] !== undefined
        ) {
            return progressState[idDecrypted as keyof ISideProgressBarStates];
        }
        return ProgressState.notStarted;
    };

    const handleClick = (item: ISubmenuData, e: React.BaseSyntheticEvent<object, any, any> | undefined) => {
        if (item.link == currentPath) return

        methods.handleSubmit(
            // valid
            async (data: any) => {
                await submitCallback(data)
                router.push({
                    pathname: item.link,
                    query: { plannerId: router.query.plannerId }
                })
            },
            // invalid
            async (data: any) => {
                handleInvalidData(data, item.link)
            }
        )(e)
    }

    const SubMenuItem = ({item}: {item: ISubmenuData}) => {
        const isCurrentPage = currentPath == item.link;

        return (
            <button
                type="button"
                onClick={e => handleClick(item, e)}
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
                    {getProgressState(item.id) == ProgressState.completed && (
                        <MdCheckCircleOutline size={20} />
                    )}
                </span>
            </button>
        );
    }

    const MainMenuItem = ({item}: {item: IMenuData}) => {
        // TODO remember if is open after routing (reduces flickering)
        //  SEE handled in ChatWindow with state prop from parent component ...?!?
        const [openSubmenu, setOpenSubmenu] = useState<boolean>(true)
        const isCurrentPage = item.id == stageInMenu

        return (<>
            <div
                className='flex bg-white p-2 w-full align-middle items-center cursor-pointer'
                onClick={e => {
                    if (item.submenu.length > 0) {
                        setOpenSubmenu(prev => !prev)
                    } else {
                        handleClick(item, e)
                    }
                }}
            >
                <span className={`w-10 h-10 border-4 rounded-full text-lg flex items-center justify-center ${isCurrentPage ? 'border-ve-collab-blue' : ''}`}>
                    <Image src={item.image} alt={`${item.text} logo`}></Image>
                </span>
                <span className={`ml-3 text-left font-konnect ${isCurrentPage ? 'font-bold' : ''}`}>
                    {item.text}
                </span>
                {item.submenu.length > 0 && (<>
                    {openSubmenu
                        ? (<MdArrowDropDown size={20} />)
                        : (<MdArrowRight size={20} />)
                    }
                </>)}

            </div>
            {(item.submenu.length > 0 && openSubmenu == true) ? (
                <ul className="flex flex-col divide-y gap-1 bg-white ml-6">
                    {item.submenu.map((subItem, subIndex) => {
                        return (
                            <li key={subIndex}>
                                <SubMenuItem item={subItem} />
                            </li>
                        );
                    })}
                </ul>
            ) : (<></>)}
        </>);
    }

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
