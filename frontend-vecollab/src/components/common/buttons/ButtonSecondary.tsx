import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonSecondary({ ...props }: ButtonProps) {
    const defaulStyle = 'bg-white border border-ve-collab-orange';

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
