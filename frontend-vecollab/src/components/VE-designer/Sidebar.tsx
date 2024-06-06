import React, { useEffect, useState } from 'react';
import completedImage from '@/images/icons/progressBar/completed.svg';
import notStartedImage from '@/images/icons/progressBar/notStarted.svg';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
    ProgressState,
    ISubmenuData,
    ISideProgressBarStates,
    IMenuData,
} from '@/interfaces/ve-designer/sideProgressBar';
import { mainMenu } from '@/data/sideMenuSteps';
import { SubmitHandler, UseFormReturn, useFormContext } from 'react-hook-form';
import PopupSaveData from '@/components/VE-designer/PopupSaveData';


import Link from 'next/link';
import { MdArrowDropDown, MdArrowRight } from 'react-icons/md';
import { IoMdArrowDropleft } from 'react-icons/io';
import { usePathname } from 'next/navigation';
import { useGetPlanById } from '@/lib/backend';

interface Props {
    methods: UseFormReturn<any, any, undefined>;
    submitCallback: (data: any) => void,
    handleInvalidData: (data: any, continueLink: string) => void,
    progressState?: ISideProgressBarStates;
    // stageInMenu?: string
    // onSubmit: SubmitHandler<any>;
}

export default function Sidebar({
    methods,
    submitCallback,
    progressState,
    // stageInMenu='generally',
    handleInvalidData,
    // onSubmit,
}: Props): JSX.Element {
    const router = useRouter();
    // const { handleSubmit } = useFormContext();

    const currentPath = usePathname()
    const { data: plan } = useGetPlanById(router.query.plannerId as string);
    const [mainMenuData, setMainMenuData] = useState<IMenuData[]>(mainMenu)

    useEffect(() => {
        if (!plan?.steps || !mainMenu?.length) return

        const userDefinedSteps = plan.steps.map(step => { return {
            text: step.name,
            id: step.name.toLowerCase(),
            link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
        }})

        // adding user defined steps to steps menu item
        setMainMenuData(prev => {
            return prev.map(item => {
                if (item.id == 'steps') {
                    // prevent adding steps multiple times
                    if (item.submenu.some(a => a.id == userDefinedSteps[0].id)) {
                        return item
                    }
                    return Object.assign({}, item, {submenu: [...item.submenu, ...userDefinedSteps]})
                } else {
                    return item
                }
            })
        })

    }, [plan])

    function renderIcon(state: ProgressState) {
        switch (state) {
            case ProgressState.completed:
                return completedImage;
            case ProgressState.notStarted:
                return notStartedImage;
            case ProgressState.uncompleted:
            default:
                return notStartedImage;
        }
    }

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

    const SubMenuItem = ({item}: {item: ISubmenuData}) => {
        const isCurrentPage = currentPath == item.link;

        return (
            <button
                type="button"
                onClick={methods.handleSubmit(
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
                )}
                className={`flex justify-between p-2 w-full`}
            >
                <p
                    className={`text-left text-sm font-konnect ${
                        isCurrentPage ? 'text-ve-collab-blue font-extrabold' : ''
                    }`}
                >
                    {item.text}
                </p>
                {(getProgressState(item.id) == ProgressState.completed
                    || getProgressState(item.id) == ProgressState.uncompleted
                ) && (
                    <Image
                        src={renderIcon(getProgressState(item.id))}
                        alt="Ve Collab Logo"
                    ></Image>
                )}
            </button>
        );
    }

    const MainMenuItem = ({item}: {item: IMenuData}) => {
        // TODO remember if is open after routing (reduces flickering)
        //  SEE handled in ChatWindow with state prop from parent component ...?!?
        const [openSubmenu, setOpenSubmenu] = useState<boolean>(true)

        const isCurrentPage = item.submenu.length
            ? item.submenu.some(a => a.link == currentPath )
            : item.link == currentPath

        return (<>
            <div
                className='flex bg-white p-2 w-full align-middle items-center cursor-pointer'
                onClick={() => {
                    if (item.submenu.length > 0) {
                        setOpenSubmenu(prev => !prev)
                    } else {
                        methods.handleSubmit(
                            // valid
                            async (data: any) => {
                                console.log('handle submit', {data});
                                await submitCallback(data)
                                router.push({
                                    pathname: item.link,
                                    query: { plannerId: router.query.plannerId }
                                })
                            },
                            // invalid
                            async (data: any) => {
                                console.log('handle submit invalid', {data});
                                handleInvalidData(data, item.link)
                            }
                        )
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
