import { IPlan } from "@/interfaces/planner/plannerInterfaces"
import { IMenuData, ISubmenuData } from "@/interfaces/ve-designer/sideProgressBar"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { UseFormReturn } from "react-hook-form";
import { MdArrowDropDown, MdArrowRight } from "react-icons/md";


export default function MainMenuItem ({
    item, plan, methods
}: {
    item: IMenuData, index: number, plan: IPlan,
    methods: UseFormReturn<any, any, undefined>;
}) {

    const [subMenu, setSubMenu] = useState<ISubmenuData[]>(item.submenu)

    // TODO remember if is open after routing (reduces flickering)
    //  SEE handled in ChatWindow with state prop from parent component ...?!?
    const [openSubmenu, setOpenSubmenu] = useState<boolean>(true)
    // console.log('Sidebar stageInMenu', {stageInMenu, isCurrentPage});

    const isCurrentPage = subMenu.length
        ? subMenu.some(a => a.link == usePathname() )
        : item.link == usePathname()

    useEffect(() => {

        if (item.id == 'steps' && plan && plan.steps && plan.steps.length > 0) {
            // danymically add user defined steps
            setSubMenu(prev => {
                // prevent adding steps twice
                if (prev.some(a => a.id == plan.steps[0].name.toLowerCase())) {
                    return prev
                }
                const userDefinedSteps = plan.steps.map((step) => { return {
                            text: step.name,
                            id: step.name.toLowerCase(),
                            link: `/ve-designer/step-data/${encodeURIComponent(step.name)}`,
                        }})

                return [...prev, ...userDefinedSteps]
            })
        }

    }, [item])

    return (<>
        <div
            className='flex bg-white p-2 w-full align-middle items-center cursor-pointer'
            onClick={() => {
                if (subMenu.length > 0) {
                    setOpenSubmenu(prev => !prev)
                } else {
                    // methods.handleSubmit(
                    //     // valid

                    //     async (data: any) => {
                    //         console.log('handle submit', {data});
                    //         await submitCallback(data)
                    //         router.push({
                    //             pathname: item.link,
                    //             query: { plannerId: router.query.plannerId }
                    //         })
                    //     },
                    //     // invalid
                    //     async (data: any) => {
                    //         console.log('handle submit invalid', {data});
                    //         handleInvalidData(data, item.link)
                    //     }
                    // )
                }
            }}
        >
            <span className={`w-10 h-10 border-4 rounded-full text-lg flex items-center justify-center ${isCurrentPage ? 'border-ve-collab-blue' : ''}`}>
                {/* <Image src={item.image} alt={`${item.text} logo`}></Image> */}
            </span>
            <span className={`ml-3 text-left font-konnect ${isCurrentPage ? 'font-bold' : ''}`}>
                {item.text}
            </span>
            {subMenu.length > 0 && (<>

                {openSubmenu
                    ? (<MdArrowDropDown size={20} />)
                    : (<MdArrowRight size={20} />)
                }
            </>)}

        </div>
        {(subMenu.length > 0 && openSubmenu == true) ? (
            <ul className="flex flex-col divide-y gap-1 bg-white ml-6">
                {subMenu.map((subItem, subIndex) => {
                    return (
                        <li key={subIndex}>
                            {/* <SubMenuItem item={subItem} index={subIndex} /> */}
                        </li>
                    );
                })}
            </ul>
        ) : (<></>)}
    </>);
}