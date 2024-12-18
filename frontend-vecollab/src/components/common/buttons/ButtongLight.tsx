import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonLight({ ...props }: ButtonProps) {
    const defaulStyle = 'bg-white shadow hover:bg-slate-100';

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
