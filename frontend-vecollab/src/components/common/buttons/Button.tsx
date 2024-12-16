import Link from 'next/link';
import React from 'react';

export interface ButtonProps {
    label?: string | JSX.Element;
    title?: string;
    children?: React.ReactNode;
    link?: string;
    onClick?: () => void;
    className?: string;
}
export default function Button({ label, title, children, link, onClick, className }: ButtonProps) {
    const defaulStyle = 'py-2 px-4 rounded-lg transition easy-in-out';

    if (typeof link !== 'undefined') {
        return (
            <Link
                href={link}
                title={title}
                onClick={onClick}
                className={`${defaulStyle} ${className || ''}`}
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
        >
            {children || label}
        </button>
    );
}
