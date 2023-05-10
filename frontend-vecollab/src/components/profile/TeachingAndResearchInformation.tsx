import BoxContentHeadline from './BoxContentHeadline';
import TagBox from './TagBox';
import TeachingInformationContentItem from './TeachingInformationContentItem';

interface Props {
    researchInterests: string[];
    courses: Course[];
}
interface Course {
    title: string;
    academic_courses: string;
    semester: string;
}

export default function TeachingAndResearchInformation({ researchInterests, courses }: Props) {
    return (
        <div className={'h-full mx-2 my-1 overflow-y-auto content-scrollbar'}>
            <BoxContentHeadline className={'my-1'} text={'Forschungsschwerpunkte'} />
            <div className={'mb-4 py-2 font-bold text-slate-900 flex flex-wrap'}>
                {researchInterests.map((text) => (
                    <TagBox key={text} text={text} />
                ))}
            </div>
            <BoxContentHeadline className={'mt-6'} text={'Lehrveranstaltungen'} />
            <ul className={'divide-y'}>
                {courses.map((course) => (
                    <TeachingInformationContentItem
                        courseTitle={course.title}
                        participatingAcademicCourses={course.academic_courses}
                        term={course.semester}
                    />
                ))}
            </ul>
        </div>
    );
}
