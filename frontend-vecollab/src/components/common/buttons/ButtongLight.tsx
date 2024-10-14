import React from 'react';
import Button, { ButtonProps } from './Button';

interface Props extends ButtonProps {
    classNameExtend?: string;
}
export default function ButtonLight({
    label,
    title,
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
            title={title}
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
