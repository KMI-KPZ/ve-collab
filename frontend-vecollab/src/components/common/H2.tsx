import React from 'react';

interface Props {
    children?: React.ReactNode;
    className?: string;
}
export default function H2({ children, className = '' }: Props) {
    const defaulStyle = 'mb-4 text-xl underline decoration-ve-collab-orange underline-offset-4';

    return <h2 className={defaulStyle + ' ' + className}>{children}</h2>;
}
