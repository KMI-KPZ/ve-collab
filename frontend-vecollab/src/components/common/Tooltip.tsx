import React from 'react';

interface Props {
    children: React.ReactNode;
    tooltipsText: string|React.ReactNode;
    position?: "top"|"left"
}

export const Tooltip = ({ children, tooltipsText, position }: Props) => {

    if (position == "left") {
        return (
            <div className="group relative inline-block">
                <div className="inline-flex rounded bg-primary text-base hover:cursor-pointer">
                    {children}
                </div>
                <div className="absolute left-0 top-0 w-[20rem] z-20 mr-2 -translate-x-full rounded bg-white border shadow px-4 py-[6px] text-sm hidden group-hover:block">
                    <span className="absolute border-t border-r right-[-7px] top-1/2 -translate-y-1/2 -z-10 h-3 w-3 rotate-45 rounded-sm bg-white"></span>
                    {tooltipsText}
                </div>
            </div>
        )
    }

    return (
        <div className="group relative inline-block">
            <div className="inline-flex rounded bg-primary text-base hover:cursor-pointer">
                {children}
            </div>
            <div className="absolute bottom-full left-1/2 w-[20rem] z-20 mb-2 -translate-x-1/2 rounded bg-white border shadow px-4 py-[6px] text-sm hidden group-hover:block">
                <span className="absolute border-b border-r bottom-[-7px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-white"></span>
                {tooltipsText}
            </div>
        </div>
    )
};
