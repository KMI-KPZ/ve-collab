import { Education, WorkExperience } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import CVEducationItem from './CVEducationItem';
import { CVWorkItem } from './CVWorkItem';
import { useTranslation } from 'next-i18next';
import NoItemAvailable from './NoItemAvailable';
import Link from 'next/link';
import { MdEdit } from 'react-icons/md';

interface Props {
    cvInfo: {
        educations: Education[];
        workExperience: WorkExperience[];
    };
}

export default function CVInformation({ cvInfo }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className={'group mx-4 my-1 flex relative'}>
            <Link
                href={'/profile/edit#tabEducation'}
                className="absolute top-1 right-0 mx-2 invisible group-hover:visible italic text-slate-600 text-xs"
            >
                <MdEdit className="inline" /> {t('common:edit')}
            </Link>

            {/* fixed height to enable scrolling instead of letting to box grow very large */}
            <div className={'w-1/2 overflow-y-auto content-scrollbar'}>
                <BoxContentHeadline className={''} text={t('education')} />
                {cvInfo.educations.length > 0 ? (
                    <ul className={'divide-y divide-gray-200 mr-4'}>
                        {cvInfo.educations.map((education, index) => (
                            <CVEducationItem
                                key={index}
                                institution={education.institution}
                                level={education.degree}
                                field={education.department}
                                timeStampFrom={education.timestamp_from}
                                timeStampTo={education.timestamp_to}
                                additionalInformation={education.additional_info}
                            />
                        ))}
                    </ul>
                ) : (
                    <NoItemAvailable />
                )}
            </div>
            <div className={'w-1/2 overflow-y-auto content-scrollbar'}>
                <BoxContentHeadline className={''} text={t('work_experience')} />
                {cvInfo.workExperience.length > 0 ? (
                    <ul className={'divide-y divide-gray-200 ml-4'}>
                        {cvInfo.workExperience.map((workExp, index) => (
                            <CVWorkItem
                                key={index}
                                position={workExp.position}
                                institution={workExp.institution}
                                timestamp_from={workExp.timestamp_from}
                                timestamp_to={workExp.timestamp_to}
                                city={workExp.city}
                                country={workExp.country}
                                additional_info={workExp.additional_info}
                                department={''}
                            />
                        ))}
                    </ul>
                ) : (
                    <NoItemAvailable />
                )}
            </div>
        </div>
    );
}
