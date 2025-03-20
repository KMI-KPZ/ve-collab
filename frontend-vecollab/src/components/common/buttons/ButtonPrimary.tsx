import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonPrimary({ ...props }: ButtonProps) {
    const defaulStyle = 'text-white bg-ve-collab-orange hover:shadow-button-primary';

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
