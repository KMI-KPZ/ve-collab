import { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    className?: string;
}

export default function WhiteBox({ children, className }: Props) {
    return (
        <div className={`p-4 my-8 bg-white rounded-md drop-shadow-sm ${className ? className : ''}`}>
            {children}
        </div>
    );
}
