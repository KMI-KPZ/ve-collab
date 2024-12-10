import React from 'react';
import Button, { ButtonProps } from './Button';

interface Props extends ButtonProps {
    classNameExtend?: string;
    isNoAuthPreview?: boolean;
}
export default function ButtonLight({
    label,
    title,
    children,
    onClick,
    className,
    classNameExtend,
    isNoAuthPreview = false,
}: Props) {
    const defaulStyle = `py-2 px-4 rounded-lg bg-white shadow ${
        isNoAuthPreview ? 'cursor-default' : 'hover:bg-slate-100'
    }`;

    return (
        <Button
            label={label}
            title={isNoAuthPreview ? undefined : title}
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
