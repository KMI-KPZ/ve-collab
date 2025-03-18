import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonLightBlue({ ...props }: ButtonProps) {
    const defaulStyle = `${
        props.disabled
            ? 'bg-gray-200 text-slate-600'
            : 'text-ve-collab-blue bg-ve-collab-blue-light hover:bg-ve-collab-blue/20'
    }`;

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
