import { RxDotFilled } from 'react-icons/rx';

interface Props {
    institution: string;
    level: string;
    field?: string;
    timeStampFrom: string;
    timeStampTo: string;
    additionalInformation?: string;
}

export default function CVEducationItem({
    institution,
    level,
    field,
    timeStampFrom,
    timeStampTo,
    additionalInformation,
}: Props) {
    return (
        <li className={'py-3'}>
            <div className={'font-bold'}>{institution}</div>
            <div className={'flex items-center'}>
                <div>{level}</div>
                {(field === undefined || field === null || field === "") ? (
                    <></>
                ) : (
                    <>
                        <RxDotFilled />
                        <div>{field}</div>
                    </>
                )}
            </div>
            <div className={'text-sm text-gray-600'}>{`${timeStampFrom}-${timeStampTo}`}</div>
            <div className={'mt-1'}>{additionalInformation}</div>
        </li>
    );
}
