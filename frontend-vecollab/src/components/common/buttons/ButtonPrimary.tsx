import React from 'react';
import Button, { ButtonProps } from './Button';

export default function ButtonPrimary({ ...props }: ButtonProps) {
    const defaulStyle = `text-white ${
        props.disabled
            ? 'bg-ve-collab-orange-light cursor-default'
            : 'bg-ve-collab-orange hover:shadow-button-primary cursor-pointer'
    }`;

    return <Button {...props} className={`${defaulStyle} ${props.className || ''}`} />;
}
