interface Props {
    label: string|JSX.Element;
    onClick: () => void
    className?: string;
    classNameExtend?: string;
}
export default function ButtonPrimary({ label, onClick, className, classNameExtend }: Props) {

    const defaulStyle = 'py-2 px-4 rounded-lg text-white bg-ve-collab-orange hover:shadow-button-primary'

    return (
        <button
            type='button'
            role="button"
            onClick={onClick}
            className={`${
                className
                    ? className
                    : classNameExtend ? `${defaulStyle} ${classNameExtend}` : defaulStyle
            }`}
        >
            {label}
        </button>
    );
}
