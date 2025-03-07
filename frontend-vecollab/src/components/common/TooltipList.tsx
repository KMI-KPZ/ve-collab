import React from 'react';

interface Props {
    children: React.ReactNode;
    tooltipsTextItems: string[];
}

export const TooltipList = ({ children, tooltipsTextItems }: Props) => {
    return (
        <div className={`group relative inline-block`}>
            <div className="inline-flex rounded-sm bg-primary cursor-help">{children}</div>
            <div
                className={`absolute bottom-full left-1/2 w-[20rem] z-20 mb-1 -translate-x-1/2 rounded-sm bg-white border border-gray-200 px-4 py-[6px] text-sm font-semibold hidden group-hover:block`}
            >
                <span className="absolute bottom-[-3px] left-1/2 -z-10 h-3 w-3 -translate-x-1/2 rotate-45 rounded-xs bg-white"></span>
                <ul>
                    {tooltipsTextItems.map((text, index) => (
                        <li key={index} className="list-disc mx-2">
                            {text}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
