interface Props {
    label?: string|JSX.Element;
    children?: JSX.Element;
    onClick: () => void
    className?: string;
}
export default function Button({ label, children, onClick, className }: Props) {

    const defaulStyle = 'py-2 px-4'

    return (
        <button
            type='button'
            role="button"
            onClick={onClick}
            className={`${defaulStyle} ${className}`}
        >
            {children || label}
        </button>
    );
}
