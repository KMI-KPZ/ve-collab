import Button from "./Button";

interface Props {
    label?: string|JSX.Element;
    children?: React.ReactNode;
    onClick: () => void
    className?: string;
    classNameExtend?: string;
}
export default function ButtonSecondary({ label, children, onClick, className, classNameExtend }: Props) {

    const defaulStyle = 'py-2 px-4 rounded-lg bg-white border border-ve-collab-orange'

    return (
        <Button
            label={label}
            onClick={onClick}
            className={`${
                className
                    ? className
                    : classNameExtend ? `${defaulStyle} ${classNameExtend}` : defaulStyle
            }`}
        >
            {children}
        </Button>
    )
}
