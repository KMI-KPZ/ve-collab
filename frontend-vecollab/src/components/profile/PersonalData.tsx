import { format, parseISO } from 'date-fns';
import BoxHeadline from '@/components/common/BoxHeadline';
import PersonalInformationItem from './PersonalInformationItem';
import TagBox from './TagBox';
import { useTranslation } from 'next-i18next';

interface Props {
    name: string;
    bio: string;
    expertise: string;
    birthday: string;
    languages: string[];
}

export default function PersonalData({ bio, name, expertise, birthday, languages }: Props) {
    const { t } = useTranslation(['community', 'common']);
    return (
        <>
            <BoxHeadline title={t('bio')} />
            <ul className={'mx-2 px-1 divide-y'}>
                <li className={'pb-4'}>
                    <div className={'text-sm my-1'}>{bio}</div>
                </li>
                <PersonalInformationItem attributeName={t('common:name')} attributeValue={name} />
                <PersonalInformationItem
                    attributeName={t('expertise')}
                    attributeValue={expertise}
                />
                <PersonalInformationItem
                    attributeName={t('birthday')}
                    attributeValue={
                        birthday === '' || birthday === undefined || birthday === null
                            ? ''
                            : format(parseISO(birthday), 'dd.MM.yyyy')
                    }
                />
                <li className={'py-4'}>
                    <div className={'text-sm text-gray-600 my-1'}>{t('languages')}</div>
                    <div className={'font-bold text-slate-900 flex flex-wrap'}>
                        {languages.map((language) => (
                            <TagBox
                                key={language}
                                text={t('common:languages.' + language, { defaultValue: language })}
                            />
                        ))}
                    </div>
                </li>
            </ul>
        </>
    );
}
