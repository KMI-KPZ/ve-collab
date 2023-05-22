import WhiteBox from '@/components/Layout/WhiteBox';
import LoadingAnimation from '@/components/LoadingAnimation';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import EditVEInfo from '@/components/profile/EditVEInfo';
import EditPersonalInformation from '@/components/profile/EditPersonalInformation';
import EditResearchAndTeachingInformation from '@/components/profile/EditResearchAndTeachingInformation';
import EditEducationInformation from '@/components/profile/EditEducationInformation';
import EditWorkExperienceInformation from '@/components/profile/EditWorkExperienceInformation';
import {
    Course,
    Education,
    PersonalInformation,
    VEInformation,
    WorkExperience,
} from '@/interfaces/profile/profileInterfaces';
import EditProfileSuccessAlert from '@/components/profile/EditProfileSuccessAlert';

export default function EditProfile() {
    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>({
        firstName: '',
        lastName: '',
        institution: '',
        bio: '',
        expertise: '',
        birthday: '',
        languageTags: [],
    });
    const [veInformation, setVeInformation] = useState<VEInformation>({
        veInterests: [''],
        veGoals: [''],
        experience: [''],
        preferredFormats: [''],
    });
    const [researchTags, setResearchTags] = useState([{ id: '', text: '' }]);
    const [courses, setCourses] = useState<Course[]>([
        { title: '', academic_courses: '', semester: '' },
        { title: '', academic_courses: '', semester: '' },
    ]);
    const [educations, setEducations] = useState<Education[]>([
        {
            institution: '',
            degree: '',
            department: '',
            timestamp_from: '',
            timestamp_to: '',
            additional_info: '',
        },
    ]);
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([
        {
            position: '',
            institution: '',
            department: '',
            timestamp_from: '',
            timestamp_to: '',
            city: '',
            country: '',
            additional_info: '',
        },
    ]);

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/profileinformation`, session?.accessToken).then((data) => {
                setLoading(false);
                if (data) {
                    console.log(data);
                    setPersonalInformation({
                        firstName: data.profile.first_name,
                        lastName: data.profile.last_name,
                        institution: data.profile.institution,
                        bio: data.profile.bio,
                        expertise: data.profile.expertise,
                        birthday: data.profile.birthday,
                        languageTags: data.profile.languages.map((language: string) => ({
                            id: language,
                            text: language,
                        })),
                    });
                    setVeInformation({
                        veInterests: data.profile.ve_interests,
                        veGoals: data.profile.ve_goals,
                        experience: data.profile.experience,
                        preferredFormats: data.profile.preferred_formats,
                    });
                    setResearchTags(
                        data.profile.research_tags.map((tag: string) => ({
                            id: tag,
                            text: tag,
                        }))
                    );
                    setCourses(data.profile.courses);
                    setEducations(data.profile.educations);
                    setWorkExperience(data.profile.work_experience);
                }
            });
        } else {
            signIn('keycloak');
        }
    }, [session, status, router]);

    const KeyCodes = {
        comma: 188,
        enter: 13,
    };

    const delimiters = [KeyCodes.comma, KeyCodes.enter];

    const updateProfileData = async (evt: FormEvent) => {
        evt.preventDefault();

        await fetchPOST(
            '/profileinformation',
            {
                first_name: personalInformation.firstName,
                last_name: personalInformation.lastName,
                institution: personalInformation.institution,
                bio: personalInformation.bio,
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languages: personalInformation.languageTags.map((elem) => elem.text),
                ve_interests: veInformation.veInterests,
                ve_goals: veInformation.veGoals,
                experience: veInformation.experience,
                preferred_formats: veInformation.preferredFormats,
                research_tags: researchTags.map((elem) => elem.text),
                courses: courses,
                educations: educations,
                work_experience: workExperience,
            },
            session?.accessToken
        );

        // render success message that disappears after 2 seconds
        setSuccessPopupOpen(true);
        setTimeout(() => {
            setSuccessPopupOpen((successPopupOpen) => false);
        }, 2000);
    };

    const importOrcidProfile = async (evt: FormEvent) => {
        evt.preventDefault();

        await fetchGET('/orcid', session?.accessToken).then((data) => {
            let profile = data.suggested_profile;
            console.log(profile);
            setPersonalInformation({
                firstName: profile.first_name,
                lastName: profile.last_name,
                bio: profile.bio,
                institution: profile.institution,
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languageTags: personalInformation.languageTags,
            });
            setResearchTags(
                profile.research_tags.map((tag: string) => ({
                    id: tag,
                    text: tag,
                }))
            );
            setEducations(profile.educations);
            setWorkExperience(profile.work_experience);
        });
    };

    return (
        <div className={'flex justify-center'}>
            <WhiteBox>
                <div className={'w-[60rem]'}>
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <VerticalTabs>
                            <div tabname="Stammdaten">
                                <EditPersonalInformation
                                    personalInformation={personalInformation}
                                    setPersonalInformation={setPersonalInformation}
                                    updateProfileData={updateProfileData}
                                    keyCodeDelimiters={delimiters}
                                    orcid={session?.user.orcid}
                                    importOrcidProfile={importOrcidProfile}
                                />
                            </div>
                            <div tabname="VE-Info">
                                <EditVEInfo
                                    veInformation={veInformation}
                                    setVeInformation={setVeInformation}
                                    updateProfileData={updateProfileData}
                                    orcid={session?.user.orcid}
                                    importOrcidProfile={importOrcidProfile}
                                />
                            </div>
                            <div tabname="Lehre & Forschung">
                                <EditResearchAndTeachingInformation
                                    researchTags={researchTags}
                                    setResearchTags={setResearchTags}
                                    courses={courses}
                                    setCourses={setCourses}
                                    updateProfileData={updateProfileData}
                                    keyCodeDelimiters={delimiters}
                                    orcid={session?.user.orcid}
                                    importOrcidProfile={importOrcidProfile}
                                />
                            </div>
                            <div tabname="Ausbildung">
                                <EditEducationInformation
                                    educations={educations}
                                    setEducations={setEducations}
                                    updateProfileData={updateProfileData}
                                    orcid={session?.user.orcid}
                                    importOrcidProfile={importOrcidProfile}
                                />
                            </div>
                            <div tabname="Berufserfahrung">
                                <EditWorkExperienceInformation
                                    workExperience={workExperience}
                                    setWorkExperience={setWorkExperience}
                                    updateProfileData={updateProfileData}
                                    orcid={session?.user.orcid}
                                    importOrcidProfile={importOrcidProfile}
                                />
                            </div>
                            <div tabname="VE-Schaufenster">
                                <div className={''}>empty</div>
                            </div>
                        </VerticalTabs>
                    )}
                </div>
            </WhiteBox>
            {successPopupOpen && <EditProfileSuccessAlert message={'Gespeichert'}/>}
        </div>
    );
}
