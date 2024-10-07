import React from 'react';
import Button from './Button';

interface Props {
    label?: string | JSX.Element;
    children?: React.ReactNode;
    onClick: () => void;
    className?: string;
    classNameExtend?: string;
}
export default function ButtonLight({
    label,
    children,
    onClick,
    className,
    classNameExtend,
}: Props) {
    const defaulStyle =
        'py-2 px-4 rounded-lg bg-white shadow hover:bg-slate-100';

    return (
        <Button
            label={label}
            onClick={onClick}
            className={`${
                className
                    ? className
                    : classNameExtend
                    ? `${defaulStyle} ${classNameExtend}`
                    : defaulStyle
            }`}
        >
            {children}
        </Button>
    );
}
