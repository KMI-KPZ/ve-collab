import React from 'react';

interface Props {
    children: React.ReactNode | null;
    tooltipsText: string | React.ReactNode | null;
    position?: 'top' | 'left' | 'right' | 'bottom' | 'bottom-right';
    className?: string;
    innerClassName?: string;
}
export const Tooltip = ({
    children: icon,
    tooltipsText,
    position,
    className,
    innerClassName,
}: Props) => {
    const Wrapper = ({ children: tooltip }: { children: React.ReactNode }) => (
        <div className={`group relative inline-block ${className}`}>
            <div className="inline-flex rounded-sm bg-primary text-base hover:cursor-pointer">
                {icon}
            </div>
            {tooltip}
        </div>
    );

    if (tooltipsText == null) return <>{icon}</>;

    if (position == 'left') {
        return (
            <Wrapper>
                <div
                    className={`absolute left-0 top-0 w-[20rem] z-20 mr-2 -translate-x-full rounded-sm bg-white border border-gray-200 shadow-sm px-4 py-[6px] text-sm hidden group-hover:block ${innerClassName}`}
                >
                    <span className="absolute border-t border-t-gray-200 border-r border-r-gray-200 right-[-7px] top-1/2 -translate-y-1/2 -z-10 h-3 w-3 rotate-45 rounded-xs bg-white"></span>
                    {tooltipsText}
                </div>
            </Wrapper>
        );
    }

    if (position == 'right') {
        return (
            <Wrapper>
                <div
                    className={`absolute -right-1/2 top-0 w-[20rem] z-20 mr-2 translate-x-full rounded-sm bg-white border border-gray-200 shadow-sm px-4 py-[6px] text-sm hidden group-hover:block ${innerClassName}`}
                >
                    <span className="absolute border-t border-t-gray-200 border-l border-l-gray-200 left-[-7px] top-1/2 -translate-y-1/2 -z-10 h-3 w-3 -rotate-45 rounded-xs bg-white"></span>
                    {tooltipsText}
                </div>
            </Wrapper>
        );
    }

    if (position == 'bottom') {
        return (
            <Wrapper>
                <div
                    className={`absolute top-full left-1/2 w-[20rem] z-20 mb-2 -translate-x-1/2 rounded-sm bg-white border border-gray-200 shadow-sm px-4 py-[6px] text-sm hidden group-hover:block ${innerClassName}`}
                >
                    <span className="absolute border-t border-t-gray-200 border-l border-l-gray-200 top-[-7px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-xs bg-white"></span>
                    {tooltipsText}
                </div>
            </Wrapper>
        );
    }

    if (position == 'bottom-right') {
        return (
            <Wrapper>
                <div
                    className={`absolute top-full -right-1/2 w-[20rem] z-20 mb-2 translate-x-[calc(100%-50px)] rounded-sm bg-white border border-gray-200 shadow-sm px-4 py-[6px] text-sm hidden group-hover:block ${innerClassName}`}
                >
                    <span className="absolute border-t border-t-gray-200 border-l border-l-gray-200 top-[-7px] -z-10 h-3 w-3 rotate-45 rounded-xs bg-white"></span>
                    {tooltipsText}
                </div>
            </Wrapper>
        );
    }

    // position: top
    return (
        <Wrapper>
            <div
                className={`absolute bottom-full left-1/2 w-[20rem] z-20 mb-2 -translate-x-1/2 rounded-sm bg-white border border-gray-200 shadow-sm px-4 py-[6px] text-sm hidden group-hover:block ${innerClassName}`}
            >
                <span className="absolute border-b border-b-gray-200 border-r border-r-gray-200 bottom-[-7px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-xs bg-white"></span>
                {tooltipsText}
            </div>
        </Wrapper>
    );
};
