import React from 'react';

export interface ButtonProps {
    label?: string | JSX.Element;
    title?: string
    children?: React.ReactNode;
    onClick: () => void;
    className?: string;
}
export default function Button({ label, title, children, onClick, className }: ButtonProps) {
    const defaulStyle = 'py-2 px-4';

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
