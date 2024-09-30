import React from 'react';

interface Props {
    children: React.ReactNode;
    tooltipsText: string|React.ReactNode;
}

export const Tooltip = ({ children, tooltipsText }: Props) => {
    return (
        <div className="group relative inline-block -mt-[10px]">
            <div className="inline-flex rounded bg-primary px-[18px] text-base">
                {children}
            </div>
            <div className="absolute bottom-full left-1/2 w-[20rem] z-20 mb-2 -translate-x-1/2 rounded bg-white border shadow px-4 py-[6px] text-sm hidden group-hover:block">
                <span className="absolute border-b border-r bottom-[-7px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-white"></span>
                {tooltipsText}
            </div>
        </div>
    );
};
