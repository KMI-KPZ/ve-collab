import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonLightBlue({ ...props }: ButtonProps) {
    const defaulStyle = 'bg-ve-collab-blue-light text-ve-collab-blue hover:bg-ve-collab-blue/20';

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
