import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonDarkBlue({ ...props }: ButtonProps) {
    const defaulStyle = 'shadow bg-ve-collab-blue text-white hover:bg-ve-collab-blue/80';

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
