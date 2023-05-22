import { Course } from '@/interfaces/profile/profileInterfaces';
import SlateBox from '../Layout/SlateBox';
import EditProfileItemRow from './EditProfileItemRow';

interface Props {
    course: Course;
    index: number;
    modifyCallbacks: {
        modifyCourseTitle(index: number, value: string): void;
        modifyCourseAcademicCourses(index: number, value: string): void;
        modifyCourseSemester(index: number, value: string): void;
    };
}

export default function EditProfileTeachingItem({ course, index, modifyCallbacks }: Props) {
    return (
        <SlateBox>
            <EditProfileItemRow
                label={'Titel'}
                value={course.title}
                onChange={(e) => modifyCallbacks.modifyCourseTitle(index, e.target.value)}
                labelElementWidth="w-1/5"
                inputElemenWidth="w-4/5"
                placeholder="Titel der Lehrveranstaltung"
            />
            <EditProfileItemRow
                label={'Studiengänge'}
                value={course.academic_courses}
                onChange={(e) => modifyCallbacks.modifyCourseAcademicCourses(index, e.target.value)}
                labelElementWidth="w-1/5"
                inputElemenWidth="w-4/5"
                placeholder="mehrere durch Komma trennen"
            />
            <EditProfileItemRow
                label={'Semester'}
                value={course.semester}
                onChange={(e) => modifyCallbacks.modifyCourseSemester(index, e.target.value)}
                labelElementWidth="w-1/5"
                inputElemenWidth="w-4/5"
                placeholder="In welchem Semester fand diese Lehrveranstaltung statt?"
            />
        </SlateBox>
    );
}
