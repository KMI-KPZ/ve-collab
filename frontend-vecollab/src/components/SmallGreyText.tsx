interface Props {
    text: string | JSX.Element
}

export default function SmallGreyText({text}: Props){
    return (
        <p className="text-sm text-gray-500">{text}</p>
    )
}