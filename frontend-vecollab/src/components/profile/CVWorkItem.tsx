import { RxDotFilled } from 'react-icons/rx';

interface Props {
    position: string;
    institution: string;
    timeStampFrom: string;
    timeStampTo: string;
    duration: string;
    city: string;
    country: string;
    additionalInformation?: string;
}

export function CVWorkItem({
    position,
    institution,
    timeStampFrom,
    timeStampTo,
    duration,
    city,
    country,
    additionalInformation,
}: Props) {
    return (
        <li className={'py-3'}>
            <div className={'font-bold'}>{position}</div>
            <div className={'flex items-center'}>
                <div>{institution}</div>
            </div>
            <div className={'flex items-center text-sm text-gray-600'}>
                <div>{`${timeStampFrom} - ${timeStampTo}`}</div>
                <RxDotFilled />
                <div>{duration}</div>
            </div>
            <div className={'text-sm text-gray-600'}>{city}, {country}</div>
            <div className={'mt-1'}>{additionalInformation}</div>
        </li>
    );
}
