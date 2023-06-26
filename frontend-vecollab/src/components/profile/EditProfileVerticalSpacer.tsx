import { ReactNode } from 'react';

interface Props {
    children: JSX.Element | JSX.Element[] | ReactNode;
}

// applies standardized vertical space (my-5) between the items
// within the edit form
export default function EditProfileVerticalSpacer({ children }: Props) {
    return <div className={'my-5'}>{children}</div>;
}
