import { format, parseISO } from 'date-fns';
import BoxHeadline from '@/components/common/BoxHeadline';
import PersonalInformationItem from './PersonalInformationItem';
import TagBox from './TagBox';

interface Props {
    name: string;
    bio: string;
    expertise: string;
    birthday: string;
    languages: string[];
}

export default function PersonalData({ bio, name, expertise, birthday, languages }: Props) {
    return (
        <>
            <BoxHeadline title={'Bio'} />
            <ul className={'mx-2 px-1 divide-y'}>
                <li className={'pb-4'}>
                    <div className={'text-sm my-1'}>{bio}</div>
                </li>
                <PersonalInformationItem attributeName={'Name'} attributeValue={name} />
                <PersonalInformationItem attributeName={'Fachgebiet'} attributeValue={expertise} />
                <PersonalInformationItem
                    attributeName={'Geburtstag'}
                    attributeValue={
                        birthday === '' || birthday === undefined || birthday === null
                            ? ''
                            : format(parseISO(birthday), 'dd.MM.yyyy')
                    }
                />
                <li className={'py-4'}>
                    <div className={'text-sm text-gray-600 my-1'}>Sprachen</div>
                    <div className={'font-bold text-slate-900 flex flex-wrap'}>
                        {languages.map((language) => (
                            <TagBox key={language} text={language} />
                        ))}
                    </div>
                </li>
            </ul>
        </>
    );
}
