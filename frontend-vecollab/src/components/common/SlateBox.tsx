interface Props {
    children: JSX.Element | JSX.Element[];
}

export default function SlateBox({ children }: Props) {
    return <div className={'p-4 my-4 shadow rounded-md'}>{children}</div>;
}
