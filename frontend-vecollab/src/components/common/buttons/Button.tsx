import Link from 'next/link';
import React, { HTMLAttributeAnchorTarget } from 'react';

export interface ButtonProps {
    label?: string | JSX.Element;
    title?: string;
    children?: React.ReactNode;
    link?: string;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
    target?: HTMLAttributeAnchorTarget | undefined;
}
export default function Button({
    label,
    title,
    children,
    link,
    onClick,
    className,
    disabled = false,
    target,
}: ButtonProps) {
    const defaulStyle = `py-2 px-4 rounded-lg transition easy-in-out ${
        !disabled ? 'hover:cursor-pointer' : ''
    }`;

    if (typeof link !== 'undefined') {
        return (
            <Link
                href={link}
                title={title}
                onClick={onClick}
                className={`${defaulStyle} ${className || ''}`}
                target={target}
            >
                {children || label}
            </Link>
        );
    }

    return (
        <button
            type="button"
            role="button"
            title={title}
            onClick={onClick}
            className={`${defaulStyle} ${className}`}
            disabled={disabled}
        >
            {children || label}
        </button>
    );
}
