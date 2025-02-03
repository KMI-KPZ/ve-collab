import NoItemAvailable from './NoItemAvailable';

interface Props {
    items: string[];
}

export default function VEInformationContentList({ items }: Props) {
    if (items.length == 0 || items.every((a) => a == '')) {
        return <NoItemAvailable />;
    }
    return (
        <ul className={'py-2 mr-2 list-disc list-inside'}>
            {items.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}
