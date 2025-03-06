import React from 'react';

interface Props {
    children?: React.ReactNode;
    className?: string;
}
export default function H1({ children, className = '' }: Props) {
    const defaulStyle =
        'mb-3 text-4xl font-bold underline decoration-ve-collab-blue decoration-4 underline-offset-8';

    return <h1 className={defaulStyle + ' ' + className}>{children}</h1>;
}
