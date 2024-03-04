import React from 'react';

interface Props {
    children: React.ReactNode;
    tooltipsText: string;
}

export const Tooltip = ({ children, tooltipsText }: Props) => {
    return (
        <div className="px-4">
            <div className="group relative inline-block">
                <div className="inline-flex rounded bg-primary px-[18px] py-2 text-base font-semibold">
                    {children}
                </div>
                <div className="absolute bottom-full left-1/2 w-[20rem] z-20 mb-1 -translate-x-1/2 rounded bg-white border px-4 py-[6px] text-sm font-semibold hidden group-hover:block">
                    <span className="absolute bottom-[-3px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-white"></span>
                    {tooltipsText}
                </div>
            </div>
        </div>
    );
};
