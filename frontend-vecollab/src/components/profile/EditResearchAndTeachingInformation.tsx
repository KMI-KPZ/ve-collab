import { Course, ResearchTag } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileTeachingItem from './EditProfileTeachingItem';
import Swapper from './Swapper';

interface Props {
    researchTags: ResearchTag[];
    setResearchTags: Dispatch<SetStateAction<ResearchTag[]>>;
    courses: Course[];
    setCourses: Dispatch<SetStateAction<Course[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    keyCodeDelimiters: number[];
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditResearchAndTeachingInformation({
    researchTags,
    setResearchTags,
    courses,
    setCourses,
    updateProfileData,
    keyCodeDelimiters,
    orcid,
    importOrcidProfile,
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

    const swapCourses = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        let newCourses = [...courses];

        // swap indices
        [newCourses[firstIndex], newCourses[secondIndex]] = [
            newCourses[secondIndex],
            newCourses[firstIndex],
        ];
        setCourses(newCourses);
    };

    const deleteFromCourses = (e: FormEvent, index: number) => {
        e.preventDefault();

        let copy = [...courses];
        copy.splice(index, 1);
        setCourses(copy);
    };

    const addCourseField = (e: FormEvent) => {
        e.preventDefault();
        setCourses([...courses, { title: '', academic_courses: '', semester: '' }]);
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Forschungsschwerpunkte'} />
                <ReactTags
                    tags={researchTags}
                    delimiters={keyCodeDelimiters}
                    handleDelete={handleDeleteResearch}
                    handleAddition={handleAdditionResearch}
                    handleDrag={handleDragResearch}
                    handleTagClick={handleTagClickResearch}
                    inputFieldPosition="bottom"
                    placeholder="Enter oder Komma, um neue Forschungsschwerpunkte hinzuzufügen"
                    classNames={{
                        tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                        tagInputField: 'w-5/6 border border-gray-500 rounded-lg my-4 px-2 py-1',
                        remove: 'ml-1',
                    }}
                />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={'Lehrveranstaltungen'} />
                <div className="mb-2 text-sm">In welchen Lehrveranstaltungen würdest du gern einen VE integrieren?</div>
                {courses.map((course, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={courses.length}
                        swapCallback={swapCourses}
                        deleteCallback={deleteFromCourses}
                    >
                        <EditProfileTeachingItem
                            course={course}
                            index={index}
                            modifyCallbacks={{
                                modifyCourseTitle,
                                modifyCourseAcademicCourses,
                                modifyCourseSemester,
                            }}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addCourseField} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
