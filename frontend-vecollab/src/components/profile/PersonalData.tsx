import { format, parseISO } from 'date-fns';
import PersonalInformationItem from './PersonalInformationItem';
import TagBox from './TagBox';
import { useTranslation } from 'next-i18next';
import H2 from '../common/H2';
import { BackendProfile } from '@/interfaces/api/apiInterfaces';
import Link from 'next/link';
import { MdEdit } from 'react-icons/md';
import NoItemAvailable from './NoItemAvailable';

interface Props {
    profile: BackendProfile;
    isOwnProfile: boolean;
}

export default function PersonalData({ profile, isOwnProfile }: Props) {
    const { t } = useTranslation(['community', 'common']);

    const hasBio = profile.bio.length > 0;
    const hasExpertise = profile.expertise.length > 0;
    const hasBirthday = profile.birthday.length > 0;
    const hasLanguage = profile.languages.length > 0;

    return (
        <div className="group">
            <H2 className="mb-4">{t('bio')}</H2>
            {isOwnProfile && (
                <div className="hidden group-hover:block absolute right-4 top-4">
                    <Link href={'/profile/edit'} className="italic text-slate-600 text-xs">
                        <MdEdit className="inline" /> {t('common:edit')}
                    </Link>
                </div>
            )}
            {!hasBio && !hasExpertise && !hasBirthday && !hasLanguage && <NoItemAvailable />}
            <ul className={'mx-2 px-1 divide-y'}>
                {hasBio && (
                    <li className={'pb-4'}>
                        <div className={'text-sm my-1'}>{profile.bio}</div>
                    </li>
                )}
                {hasExpertise && (
                    <PersonalInformationItem
                        attributeName={t('expertise')}
                        attributeValue={t('expertise_options.' + profile.expertise, {
                            defaultValue: profile.expertise,
                        })}
                    />
                )}
                {hasBirthday && (
                    <PersonalInformationItem
                        attributeName={t('birthday')}
                        attributeValue={
                            profile.birthday.length > 0
                                ? format(parseISO(profile.birthday), 'dd.MM.yyyy')
                                : ''
                        }
                    />
                )}
                {hasLanguage && (
                    <li className={'py-4'}>
                        <div className={'text-sm text-gray-600 my-1'}>{t('languages')}</div>
                        <div className={'font-bold text-slate-900 flex flex-wrap'}>
                            {profile.languages.map((language) => (
                                <TagBox
                                    key={language}
                                    text={t('common:languages.' + language, {
                                        defaultValue: language,
                                    })}
                                />
                            ))}
                        </div>
                    </li>
                )}
            </ul>
        </div>
    );
}
