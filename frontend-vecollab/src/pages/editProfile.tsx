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

interface Course {
    title: string;
    academic_courses: string;
    semester: string;
}

interface Education {
    institution: string;
    degree: string;
    department?: string;
    timestamp_from: string;
    timestamp_to: string;
    additional_info?: string;
}

interface WorkExperience {
    position: string;
    institution: string;
    department?: string;
    timestamp_from?: string;
    timestamp_to?: string;
    city?: string;
    country?: string;
    additional_info?: string;
}

export default function EditProfile() {
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [institution, setInstitution] = useState<string>('');
    const [bio, setBio] = useState('');
    const [expertise, setExpertise] = useState('');
    const [birthday, setBirthday] = useState('');
    const [languageTags, setLanguageTags] = useState([{ id: '', text: '' }]);
    const [veInterests, setVeInterests] = useState(['', '']);
    const [veGoals, setVeGoals] = useState(['']);
    const [experience, setExperience] = useState(['']);
    const [preferredFormats, setPreferredFormats] = useState(['']);
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
                    setFirstName(data.profile.first_name);
                    setLastName(data.profile.last_name);
                    setInstitution(data.profile.institution);
                    setBio(data.profile.bio);
                    setExpertise(data.profile.expertise);
                    setBirthday(data.profile.birthday);
                    setLanguageTags(
                        data.profile.languages.map((language: string) => ({
                            id: language,
                            text: language,
                        }))
                    );
                    setVeInterests(data.profile.ve_interests);
                    setVeGoals(data.profile.ve_goals);
                    setExperience(data.profile.experience);
                    setPreferredFormats(data.profile.preferred_formats);
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
                first_name: firstName,
                last_name: lastName,
                institution: institution,
                bio: bio,
                expertise: expertise,
                birthday: birthday,
                languages: languageTags.map((elem) => elem.text),
                ve_interests: veInterests,
                ve_goals: veGoals,
                experience: experience,
                preferred_formats: preferredFormats,
                research_tags: researchTags.map((elem) => elem.text),
                courses: courses,
                educations: educations,
                work_experience: workExperience,
            },
            session?.accessToken
        );

        // TODO render success ui feedback
    };

    const importOrcidProfile = async (evt: FormEvent) => {
        evt.preventDefault();

        await fetchGET('/orcid', session?.accessToken).then((data) => {
            let profile = data.suggested_profile;
            console.log(profile);
            setBio(profile.bio);
            setInstitution(profile.institution);
            setResearchTags(
                profile.research_tags.map((tag: string) => ({
                    id: tag,
                    text: tag,
                }))
            );
            setFirstName(profile.first_name);
            setLastName(profile.last_name);
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
                                    firstName={firstName}
                                    setFirstName={setFirstName}
                                    lastName={lastName}
                                    setLastName={setLastName}
                                    institution={institution}
                                    setInstitution={setInstitution}
                                    bio={bio}
                                    setBio={setBio}
                                    expertise={expertise}
                                    setExpertise={setExpertise}
                                    birthday={birthday}
                                    setBirthday={setBirthday}
                                    languageTags={languageTags}
                                    setLanguageTags={setLanguageTags}
                                    updateProfileData={updateProfileData}
                                    keyCodeDelimiters={delimiters}
                                    orcid={session?.user.orcid}
                                    importOrcidProfile={importOrcidProfile}
                                />
                            </div>
                            <div tabname="VE-Info">
                                <EditVEInfo
                                    veInterests={veInterests}
                                    setVeInterests={setVeInterests}
                                    veGoals={veGoals}
                                    setVeGoals={setVeGoals}
                                    experience={experience}
                                    setExperience={setExperience}
                                    preferredFormats={preferredFormats}
                                    setPreferredFormats={setPreferredFormats}
                                    updateProfileData={updateProfileData}
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
                                />
                            </div>
                            <div tabname="Ausbildung">
                                <EditEducationInformation
                                    educations={educations}
                                    setEducations={setEducations}
                                    updateProfileData={updateProfileData}
                                />
                            </div>
                            <div tabname="Berufserfahrung">
                                <EditWorkExperienceInformation
                                    workExperience={workExperience}
                                    setWorkExperience={setWorkExperience}
                                    updateProfileData={updateProfileData}
                                />
                            </div>
                            <div tabname="VE-Schaufenster">
                                <div className={''}>empty</div>
                            </div>
                        </VerticalTabs>
                    )}
                </div>
            </WhiteBox>
        </div>
    );
}
