import { Course, ResearchTag } from '@/interfaces/profile/profileInterfaces';
import Link from 'next/link';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { WithContext as ReactTags } from 'react-tag-input';

interface Props {
    researchTags: ResearchTag[];
    setResearchTags: Dispatch<SetStateAction<ResearchTag[]>>;
    courses: Course[];
    setCourses: Dispatch<SetStateAction<Course[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    keyCodeDelimiters: number[];
}

export default function EditResearchAndTeachingInformation({
    researchTags,
    setResearchTags,
    courses,
    setCourses,
    updateProfileData,
    keyCodeDelimiters
}: Props) {
    const handleDeleteResearch = (i: number) => {
        setResearchTags(researchTags.filter((tag, index) => index !== i));
    };

    const handleAdditionResearch = (tag: { id: string; text: string }) => {
        setResearchTags([...researchTags, tag]);
    };

    const handleDragResearch = (
        tag: { id: string; text: string },
        currPos: number,
        newPos: number
    ) => {
        const newTags = researchTags.slice();

        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);

        // re-render
        setResearchTags(newTags);
    };

    const handleTagClickResearch = (index: number) => {
        console.log('The tag at index ' + index + ' was clicked');
    };

    const modifyCourseTitle = (index: number, value: string) => {
        let newCourses = [...courses];
        newCourses[index].title = value;
        setCourses(newCourses);
    };

    const modifyCourseAcademicCourses = (index: number, value: string) => {
        let newCourses = [...courses];
        newCourses[index].academic_courses = value;
        setCourses(newCourses);
    };

    const modifyCourseSemester = (index: number, value: string) => {
        let newCourses = [...courses];
        newCourses[index].semester = value;
        setCourses(newCourses);
    };

    const addCourseField = (e: FormEvent) => {
        e.preventDefault();
        setCourses([...courses, { title: '', academic_courses: '', semester: '' }]);
    };

    const removeCourseField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...courses]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setCourses(copy);
    };

    return (
        <form onSubmit={updateProfileData}>
            <div className={'flex justify-end'}>
                <Link href={'/profile'}>
                    <button className={'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'}>
                        Abbrechen
                    </button>
                </Link>
                <button
                    type="submit"
                    className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                >
                    Speichern
                </button>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                    Forschungsschwerpunkte
                </div>
                <ReactTags
                    tags={researchTags}
                    delimiters={keyCodeDelimiters}
                    handleDelete={handleDeleteResearch}
                    handleAddition={handleAdditionResearch}
                    handleDrag={handleDragResearch}
                    handleTagClick={handleTagClickResearch}
                    inputFieldPosition="bottom"
                    placeholder="Enter oder Komma, um neue Sprache hinzuzufügen"
                    classNames={{
                        tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                        tagInputField: 'w-2/3 border border-gray-500 rounded-lg my-4 px-2 py-1',
                        remove: 'ml-1',
                    }}
                />
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Lehrveranstaltungen</div>
                {courses.map((course, index) => (
                    <div
                        key={index}
                        className={'p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'}
                    >
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
                                    onChange={(e) => modifyCourseTitle(index, e.target.value)}
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
                                        modifyCourseAcademicCourses(index, e.target.value)
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
                                    onChange={(e) => modifyCourseSemester(index, e.target.value)}
                                    placeholder="In welchem Jahr fand diese Lehrveranstaltung statt?"
                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                <div className={'w-full mt-1 px-2 flex justify-end'}>
                    <button onClick={(e) => removeCourseField(e)}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={(e) => addCourseField(e)}>
                        <RxPlus size={20} />
                    </button>
                </div>
            </div>
        </form>
    );
}
