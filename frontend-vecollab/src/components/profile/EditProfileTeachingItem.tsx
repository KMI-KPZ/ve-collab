import { Course } from '@/interfaces/profile/profileInterfaces';

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
        <div className={'p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'}>
            <div className="mt-2 flex">
                <div className="w-1/5 flex items-center">
                    <label htmlFor="title" className="px-2 py-2">
                        Titel
                    </label>
                </div>
                <div className="w-4/5">
                    <input
                        type="text"
                        name="title"
                        value={course.title}
                        onChange={(e) => modifyCallbacks.modifyCourseTitle(index, e.target.value)}
                        placeholder="Titel der Lehrveranstaltung"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/5 flex items-center">
                    <label htmlFor="academic_courses" className="px-2 py-2">
                        Studiengänge
                    </label>
                </div>
                <div className="w-4/5">
                    <input
                        type="text"
                        name="academic_courses"
                        value={course.academic_courses}
                        onChange={(e) =>
                            modifyCallbacks.modifyCourseAcademicCourses(index, e.target.value)
                        }
                        placeholder="mehrere durch Komma trennen"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
                </div>
            </div>
            <div className="mt-2 flex">
                <div className="w-1/5 flex items-center">
                    <label htmlFor="semester" className="px-2 py-2">
                        Semester
                    </label>
                </div>
                <div className="w-4/5">
                    <input
                        type="text"
                        name="semester"
                        value={course.semester}
                        onChange={(e) =>
                            modifyCallbacks.modifyCourseSemester(index, e.target.value)
                        }
                        placeholder="In welchem Semester fand diese Lehrveranstaltung statt?"
                        className="border border-gray-500 rounded-lg w-full h-12 p-2"
                    />
                </div>
            </div>
        </div>
    );
}
