import Link from 'next/link';

interface Props {
    title: string;
    excerpt: string;
    _id: string;
    date?: string;
}

export default function VEVitrineItem({ title, excerpt, _id, date }: Props) {
    return (
        <Link href={`/ve-designer/name?plannerId=${_id}`}>
            <li
                className={
                    'py-4 px-1 border border-white rounded-xl hover:border hover:border-ve-collab-orange'
                }
            >
                <div className={'font-bold text-lg'}>{title}</div>
                <div className={'text-sm text-gray-600 my-1'}>{excerpt}</div>
                {date !== undefined && <div>{date}</div>}
            </li>
        </Link>
    );
}
