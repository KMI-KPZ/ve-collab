import { Course} from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileTeachingItem from './EditProfileTeachingItem';
import Swapper from './Swapper';

interface Props {
    researchTags: string[];
    setResearchTags: Dispatch<SetStateAction<string[]>>;
    courses: Course[];
    setCourses: Dispatch<SetStateAction<Course[]>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditResearchAndTeachingInformation({
    researchTags,
    setResearchTags,
    courses,
    setCourses,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {

    const modifyResearchTags = (index: number, value: string) => {
        let newResearchTags = [...researchTags];
        newResearchTags[index] = value;
        setResearchTags(newResearchTags);
    };

    const swapResearchTags = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();
        let newResearchTags = [...researchTags];
        // swap indices
        [
            newResearchTags[firstIndex],
            newResearchTags[secondIndex],
        ] = [
            newResearchTags[secondIndex],
            newResearchTags[firstIndex],
        ];
        setResearchTags(newResearchTags);
    };

    const deleteFromResearchTags = (e: FormEvent, index: number) => {
        e.preventDefault();
        researchTags.splice(index, 1);
        setResearchTags(researchTags);
    };

    const addLanguageTagInputField = (e: FormEvent) => {
        e.preventDefault();
        setResearchTags([...researchTags, ""],
        );
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
                {researchTags.map((researchTag, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={researchTags.length}
                        swapCallback={swapResearchTags}
                        deleteCallback={deleteFromResearchTags}
                    >
                        <input
                            className={'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'}
                            type="text"
                            placeholder="Verwende ein Feld pro Forschungsschwerpunkt"
                            value={researchTag}
                            onChange={(e) => modifyResearchTags(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addLanguageTagInputField} />
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
