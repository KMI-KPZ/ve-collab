import { ResearchAndTeachingInformation } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import TagBox from './TagBox';
import TeachingInformationContentItem from './TeachingInformationContentItem';
import { useTranslation } from 'next-i18next';
import NoItemAvailable from './NoItemAvailable';
import Link from 'next/link';
import { MdEdit } from 'react-icons/md';

interface Props {
    researchAndTeachingInfo: ResearchAndTeachingInformation;
}

export default function TeachingAndResearchInformation({ researchAndTeachingInfo }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div
            className={
                'relative group grid grid-cols-2 grid-rows-2 grid-flow-col gap-4 mx-4 my-1 overflow-y-auto content-scrollbar'
            }
        >
            <Link
                href={'/profile/edit#tabResearchAndTeaching'}
                className="absolute right-0 top-0 mx-2 invisible group-hover:visible italic text-slate-600 text-xs"
            >
                <MdEdit className="inline" /> {t('common:edit')}
            </Link>
            <div>
                <BoxContentHeadline className={''} text={t('research_focus')} />
                {researchAndTeachingInfo.researchTags.length > 0 ? (
                    <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                        {researchAndTeachingInfo.researchTags.map((text) => (
                            <TagBox key={text} text={text} />
                        ))}
                    </div>
                ) : (
                    <NoItemAvailable />
                )}
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('lms')} />
                {researchAndTeachingInfo.lms.length > 0 ? (
                    <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                        {researchAndTeachingInfo.lms.map((text) => (
                            <TagBox key={text} text={text} />
                        ))}
                    </div>
                ) : (
                    <NoItemAvailable />
                )}
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('tools')} />
                {researchAndTeachingInfo.tools.length > 0 ? (
                    <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                        {researchAndTeachingInfo.tools.map((text) => (
                            <TagBox key={text} text={text} />
                        ))}
                    </div>
                ) : (
                    <NoItemAvailable />
                )}
            </div>
            <div>
                <BoxContentHeadline className={''} text={t('lectures')} />
                {researchAndTeachingInfo.courses.length > 0 ? (
                    <ul className={'divide-y divide-gray-200'}>
                        {researchAndTeachingInfo.courses.map((course, index) => (
                            <TeachingInformationContentItem
                                key={index}
                                courseTitle={course.title}
                                participatingAcademicCourses={course.academic_courses}
                                term={course.semester}
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
