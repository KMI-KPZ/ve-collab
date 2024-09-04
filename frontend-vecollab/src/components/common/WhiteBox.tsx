interface Props {
    children: JSX.Element | JSX.Element[];
    className?: string;
}

export default function WhiteBox({ children, className }: Props) {
    return (
        <div className={`p-4 my-8 bg-white rounded-3xl shadow-2xl ${className ? className : ''}`}>{children}</div>
    );
}
