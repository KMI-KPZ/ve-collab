import { Course } from '@/interfaces/profile/profileInterfaces';
import SlateBox from '../common/SlateBox';
import EditProfileItemRow from './EditProfileItemRow';
import { useTranslation } from 'next-i18next';

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
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="w-full">
            <SlateBox>
                <EditProfileItemRow
                    label={t("lecture_title")}
                    value={course.title}
                    onChange={(e) => modifyCallbacks.modifyCourseTitle(index, e.target.value)}
                    labelElementWidth="w-3/12"
                    inputElemenWidth="w-9/12"
                    placeholder={t("lecture_title_placeholder")}
                />
                <EditProfileItemRow
                    label={t("academic_courses")}
                    value={course.academic_courses}
                    onChange={(e) =>
                        modifyCallbacks.modifyCourseAcademicCourses(index, e.target.value)
                    }
                    labelElementWidth="w-3/12"
                    inputElemenWidth="w-9/12"
                    placeholder={t("common:split_multiple_by_comma")}
                />
                <EditProfileItemRow
                    label={t("semester")}
                    value={course.semester}
                    onChange={(e) => modifyCallbacks.modifyCourseSemester(index, e.target.value)}
                    labelElementWidth="w-3/12"
                    inputElemenWidth="w-9/12"
                    placeholder={t("semester_placeholder")}
                />
            </SlateBox>
        </div>
    );
}
