interface Props {
    title: string,
    excerpt: string,
    date: string
}

export default function VEVitrineItem({title, excerpt, date}: Props) {
    return (
        <li className={"py-4 px-1 border border-white rounded-xl hover:border hover:border-ve-collab-orange"}>
            <div className={"font-bold text-lg"}>{title}</div>
            <div className={"text-sm text-gray-600 my-1"}>{excerpt}</div>
            <div>{date}</div>
        </li>
    )
}