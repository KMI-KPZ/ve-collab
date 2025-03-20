interface Props {
    text: string;
    className: string;
}

export default function BoxContentHeadline({ text, className }: Props) {
    return <div className={`font-bold text-slate-900 text-2xl ${className}`}>{text}</div>;
}
