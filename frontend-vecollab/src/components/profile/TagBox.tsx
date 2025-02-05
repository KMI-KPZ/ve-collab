interface Props {
    text: string;
}

export default function TagBox({ text }: Props) {
    return <div className={'mr-2 mb-2 px-2 rounded-lg bg-slate-200 shadow'}>{text}</div>;
}
