import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import { RxDotFilled } from 'react-icons/rx';

export function CVWorkItem({
    position,
    institution,
    timestamp_from,
    timestamp_to,
    city,
    country,
    additional_info,
}: WorkExperience) {
    return (
        <li className={'py-3'}>
            <div className={'font-bold'}>{position}</div>
            <div className={'flex items-center'}>
                <div>{institution}</div>
            </div>
            <div className={'flex items-center text-sm text-gray-600'}>
                <div>{`${timestamp_from} - ${timestamp_to === "" ? "heute" : timestamp_to}`}</div>
                <RxDotFilled />
                <div>{"6000 Monate"}</div> {/* TODO compute as soon as inputs are true iso timestamps*/}
            </div>
            <div className={'text-sm text-gray-600'}>{city}, {country}</div>
            <div className={'mt-1'}>{additional_info}</div>
        </li>
    );
}
