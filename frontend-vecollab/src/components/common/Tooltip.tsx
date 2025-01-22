import React from 'react';

interface Props {
    children: React.ReactNode;
    tooltipsText: string | React.ReactNode;
    position?: 'top' | 'left' | 'right';
    className?: string;
}

export const Tooltip = ({ children: icon, tooltipsText, position, className }: Props) => {
    const Wrapper = ({ children: tooltip }: { children: React.ReactNode }) => (
        <div className={`group relative inline-block ${className}`}>
            <div className="inline-flex rounded bg-primary text-base hover:cursor-pointer">
                {icon}
            </div>
            {tooltip}
        </div>
    );

    if (position == 'left') {
        return (
            <Wrapper>
                <div className="absolute left-0 top-0 w-[20rem] z-20 mr-2 -translate-x-full rounded bg-white border shadow px-4 py-[6px] text-sm hidden group-hover:block">
                    <span className="absolute border-t border-r right-[-7px] top-1/2 -translate-y-1/2 -z-10 h-3 w-3 rotate-45 rounded-sm bg-white"></span>
                    {tooltipsText}
                </div>
            </Wrapper>
        );
    }

    if (position == 'right') {
        return (
            <Wrapper>
                <div className="absolute -right-1/2 top-0 w-[20rem] z-20 mr-2 translate-x-full rounded bg-white border shadow px-4 py-[6px] text-sm hidden group-hover:block">
                    <span className="absolute border-t border-l left-[-7px] top-1/2 -translate-y-1/2 -z-10 h-3 w-3 -rotate-45 rounded-sm bg-white"></span>
                    {tooltipsText}
                </div>
            </Wrapper>
        );
    }

    // position: top
    return (
        <Wrapper>
            <div className="absolute bottom-full left-1/2 w-[20rem] z-20 mb-2 -translate-x-1/2 rounded bg-white border shadow px-4 py-[6px] text-sm hidden group-hover:block">
                <span className="absolute border-b border-r bottom-[-7px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-white"></span>
                {tooltipsText}
            </div>
        </Wrapper>
    );
};
