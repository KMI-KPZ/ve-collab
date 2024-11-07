import { ResearchAndTeachingInformation } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import TagBox from './TagBox';
import TeachingInformationContentItem from './TeachingInformationContentItem';
import { useTranslation } from 'next-i18next';

interface Props {
    researchAndTeachingInfo: ResearchAndTeachingInformation;
}

export default function TeachingAndResearchInformation({ researchAndTeachingInfo }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className={'min-h-[30rem] mx-2 my-1 overflow-y-auto content-scrollbar'}>
            <BoxContentHeadline className={'my-1'} text={t("research_focus")} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                {researchAndTeachingInfo.researchTags.map((text) => (
                    <TagBox key={text} text={text} />
                ))}
            </div>
            <BoxContentHeadline className={'mt-6'} text={t("lms")} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                {researchAndTeachingInfo.lms.map((text) => (
                    <TagBox key={text} text={text} />
                ))}
            </div>
            <BoxContentHeadline className={'mt-6'} text={t("tools")} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                {researchAndTeachingInfo.tools.map((text) => (
                    <TagBox key={text} text={text} />
                ))}
            </div>
            <BoxContentHeadline className={'mt-6'} text={t("lectures")} />
            <ul className={'divide-y'}>
                {researchAndTeachingInfo.courses.map((course, index) => (
                    <TeachingInformationContentItem
                        key={index}
                        courseTitle={course.title}
                        participatingAcademicCourses={course.academic_courses}
                        term={course.semester}
                    />
                ))}
            </ul>
        </div>
    );
}
