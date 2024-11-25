import { ResearchAndTeachingInformation } from '@/interfaces/profile/profileInterfaces';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfilePlusMinusButtons from './EditProfilePlusMinusButtons';
import EditProfileTeachingItem from './EditProfileTeachingItem';
import Swapper from './Swapper';
import { useTranslation } from 'next-i18next';

interface Props {
    researchAndTeachingInformation: ResearchAndTeachingInformation;
    setResearchAndTeachingInformation: Dispatch<SetStateAction<ResearchAndTeachingInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditResearchAndTeachingInformation({
    researchAndTeachingInformation,
    setResearchAndTeachingInformation,
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { t } = useTranslation(['community', 'common']);

    const modifyResearchTags = (index: number, value: string) => {
        let newResearchTags = [...researchAndTeachingInformation.researchTags];
        newResearchTags[index] = value;
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            researchTags: newResearchTags,
        });
    };

    const swapResearchTags = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();
        let newResearchTags = [...researchAndTeachingInformation.researchTags];
        // swap indices
        [newResearchTags[firstIndex], newResearchTags[secondIndex]] = [
            newResearchTags[secondIndex],
            newResearchTags[firstIndex],
        ];
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            researchTags: newResearchTags,
        });
    };

    const deleteFromResearchTags = (e: FormEvent, index: number) => {
        e.preventDefault();
        let copy = [...researchAndTeachingInformation.researchTags];
        copy.splice(index, 1);
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            researchTags: copy,
        });
    };

    const addResearchTagInputField = (e: FormEvent) => {
        e.preventDefault();
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            researchTags: [...researchAndTeachingInformation.researchTags, ''],
        });
    };

    const modifyCourseTitle = (index: number, value: string) => {
        let newCourses = [...researchAndTeachingInformation.courses];
        newCourses[index].title = value;
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            courses: newCourses,
        });
    };

    const modifyCourseAcademicCourses = (index: number, value: string) => {
        let newCourses = [...researchAndTeachingInformation.courses];
        newCourses[index].academic_courses = value;
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            courses: newCourses,
        });
    };

    const modifyCourseSemester = (index: number, value: string) => {
        let newCourses = [...researchAndTeachingInformation.courses];
        newCourses[index].semester = value;
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            courses: newCourses,
        });
    };

    const swapCourses = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();

        let newCourses = [...researchAndTeachingInformation.courses];

        // swap indices
        [newCourses[firstIndex], newCourses[secondIndex]] = [
            newCourses[secondIndex],
            newCourses[firstIndex],
        ];
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            courses: newCourses,
        });
    };

    const deleteFromCourses = (e: FormEvent, index: number) => {
        e.preventDefault();

        let copy = [...researchAndTeachingInformation.courses];
        copy.splice(index, 1);
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, courses: copy });
    };

    const addCourseField = (e: FormEvent) => {
        e.preventDefault();
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            courses: [
                ...researchAndTeachingInformation.courses,
                { title: '', academic_courses: '', semester: '' },
            ],
        });
    };

    const modifyLms = (index: number, value: string) => {
        let newLms = [...researchAndTeachingInformation.lms];
        newLms[index] = value;
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, lms: newLms });
    };

    const swapLms = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();
        let newLms = [...researchAndTeachingInformation.lms];
        // swap indices
        [newLms[firstIndex], newLms[secondIndex]] = [newLms[secondIndex], newLms[firstIndex]];
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, lms: newLms });
    };

    const deleteFromLms = (e: FormEvent, index: number) => {
        e.preventDefault();
        let copy = [...researchAndTeachingInformation.lms];
        copy.splice(index, 1);
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, lms: copy });
    };

    const addLmsInputField = (e: FormEvent) => {
        e.preventDefault();
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            lms: [...researchAndTeachingInformation.lms, ''],
        });
    };

    const modifyTools = (index: number, value: string) => {
        let newTools = [...researchAndTeachingInformation.tools];
        newTools[index] = value;
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, tools: newTools });
    };

    const swapTools = (e: FormEvent, firstIndex: number, secondIndex: number) => {
        e.preventDefault();
        let newTools = [...researchAndTeachingInformation.tools];
        // swap indices
        [newTools[firstIndex], newTools[secondIndex]] = [
            newTools[secondIndex],
            newTools[firstIndex],
        ];
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, tools: newTools });
    };

    const deleteFromTools = (e: FormEvent, index: number) => {
        e.preventDefault();
        let copy = [...researchAndTeachingInformation.tools];
        copy.splice(index, 1);
        setResearchAndTeachingInformation({ ...researchAndTeachingInformation, tools: copy });
    };

    const addToolsInputField = (e: FormEvent) => {
        e.preventDefault();
        setResearchAndTeachingInformation({
            ...researchAndTeachingInformation,
            tools: [...researchAndTeachingInformation.tools, ''],
        });
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('research_focus')} />
                <div className="mb-2 text-sm">{t('research_focus_question')}</div>
                {researchAndTeachingInformation.researchTags.map((researchTag, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={researchAndTeachingInformation.researchTags.length}
                        swapCallback={swapResearchTags}
                        deleteCallback={deleteFromResearchTags}
                    >
                        <input
                            className={
                                'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'
                            }
                            type="text"
                            placeholder={t('one_field_per_research_focus')}
                            value={researchTag}
                            onChange={(e) => modifyResearchTags(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addResearchTagInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('lectures')} />
                <div className="mb-2 text-sm">{t('lectures_question')}</div>
                {researchAndTeachingInformation.courses.map((course, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={researchAndTeachingInformation.courses.length}
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
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('lms')} />
                <div className="mb-2 text-sm">{t('lms_question')}</div>
                {researchAndTeachingInformation.lms.map((lmsItem, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={researchAndTeachingInformation.lms.length}
                        swapCallback={swapLms}
                        deleteCallback={deleteFromLms}
                    >
                        <input
                            className={
                                'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'
                            }
                            type="text"
                            placeholder={t('one_field_per_lms')}
                            value={lmsItem}
                            onChange={(e) => modifyLms(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addLmsInputField} />
            </EditProfileVerticalSpacer>
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('tools')} />
                <div className="mb-2 text-sm">{t('tools_question')}</div>
                {researchAndTeachingInformation.tools.map((tool, index) => (
                    <Swapper
                        key={index}
                        index={index}
                        arrayLength={researchAndTeachingInformation.tools.length}
                        swapCallback={swapTools}
                        deleteCallback={deleteFromTools}
                    >
                        <input
                            className={
                                'border border-[#cccccc] rounded-md px-2 py-[6px] mb-1 w-full'
                            }
                            type="text"
                            placeholder={t('one_field_per_tool')}
                            value={tool}
                            onChange={(e) => modifyTools(index, e.target.value)}
                        />
                    </Swapper>
                ))}
                <EditProfilePlusMinusButtons plusCallback={addToolsInputField} />
            </EditProfileVerticalSpacer>
        </form>
    );
}
