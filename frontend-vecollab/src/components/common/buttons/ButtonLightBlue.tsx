import Button from "./Button";

interface Props {
    label?: string|JSX.Element;
    children?: JSX.Element;
    onClick: () => void
    className?: string;
    classNameExtend?: string;
}
export default function ButtonLightBlue({ label, children, onClick, className, classNameExtend }: Props) {

    const defaulStyle = 'py-2 px-4 rounded-lg bg-ve-collab-blue-light text-ve-collab-blue hover:shadow-button-blue-light'

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
