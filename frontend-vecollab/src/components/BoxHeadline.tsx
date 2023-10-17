interface Props {
    title: string;
}

export default function BoxHeadline({ title }: Props) {
    return <div className={'mx-2 px-1 my-1 font-bold text-slate-900 text-xl'}>{title}</div>;
}
