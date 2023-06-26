interface Props {
    attributeName: string;
    attributeValue: string;
}

export default function PersonalInformationItem({ attributeName, attributeValue }: Props) {
    return (
        <li className={'py-4'}>
            <div className={'text-sm text-gray-600 my-1'}>{attributeName}</div>
            <div className={'font-bold text-slate-900'}>{attributeValue}</div>
        </li>
    );
}
