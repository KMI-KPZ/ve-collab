interface Props {
    items: string[];
}

export default function VEInformationContentList({ items }: Props) {
    return (
        <ul className={'py-2 mr-2 list-disc list-inside'}>
            {items.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}
