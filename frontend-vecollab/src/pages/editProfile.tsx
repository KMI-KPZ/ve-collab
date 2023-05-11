import WhiteBox from '@/components/Layout/WhiteBox';
import LoadingAnimation from '@/components/LoadingAnimation';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { WithContext as ReactTags } from 'react-tag-input';
import Image from 'next/image';

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
    const [firstName, setFirstName] = useState<string | undefined>('');
    const [lastName, setLastName] = useState<string | undefined>('');
    const [institution, setInstitution] = useState<string | undefined>('');
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

    const handleDeleteLanguage = (i: number) => {
        setLanguageTags(languageTags.filter((tag, index) => index !== i));
    };

    const handleAdditionLanguage = (tag: { id: string; text: string }) => {
        setLanguageTags([...languageTags, tag]);
    };

    const handleDragLanguage = (
        tag: { id: string; text: string },
        currPos: number,
        newPos: number
    ) => {
        const newTags = languageTags.slice();

        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);

        // re-render
        setLanguageTags(newTags);
    };

    const handleTagClickLanguage = (index: number) => {
        console.log('The tag at index ' + index + ' was clicked');
    };

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

    const KeyCodes = {
        comma: 188,
        enter: 13,
    };

    const delimiters = [KeyCodes.comma, KeyCodes.enter];

    const modifyVeInterests = (index: number, value: string) => {
        let newInterests = [...veInterests];
        newInterests[index] = value;
        setVeInterests(newInterests);
    };

    const addVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInterests([...veInterests, '']);
    };

    const removeVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veInterests]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeInterests(copy);
    };

    const modifyVeGoals = (index: number, value: string) => {
        let newGoals = [...veGoals];
        newGoals[index] = value;
        setVeGoals(newGoals);
    };

    const addVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeGoals([...veGoals, '']);
    };

    const removeVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veGoals]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeGoals(copy);
    };

    const modifyExperience = (index: number, value: string) => {
        let newExperience = [...experience];
        newExperience[index] = value;
        setExperience(newExperience);
    };

    const addExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        setExperience([...experience, '']);
    };

    const removeExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...experience]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setExperience(copy);
    };

    const modifyPreferredFormats = (index: number, value: string) => {
        let newFormats = [...preferredFormats];
        newFormats[index] = value;
        setPreferredFormats(newFormats);
    };

    const addPreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        setPreferredFormats([...preferredFormats, '']);
    };

    const removePreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...preferredFormats]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setPreferredFormats(copy);
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

    const modifyEducationInstitution = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].institution = value;
        setEducations(newEducations);
    };

    const modifyEducationDegree = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].degree = value;
        setEducations(newEducations);
    };

    const modifyEducationDepartment = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].department = value;
        setEducations(newEducations);
    };

    const modifyEducationTimestampFrom = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].timestamp_from = value;
        setEducations(newEducations);
    };

    const modifyEducationTimestampTo = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].timestamp_to = value;
        setEducations(newEducations);
    };

    const modifyEducationAdditionalInfo = (index: number, value: string) => {
        let newEducations = [...educations];
        newEducations[index].additional_info = value;
        setEducations(newEducations);
    };

    const addEducationField = (e: FormEvent) => {
        e.preventDefault();
        setEducations([
            ...educations,
            {
                institution: '',
                degree: '',
                department: '',
                timestamp_from: '',
                timestamp_to: '',
                additional_info: '',
            },
        ]);
    };

    const modifyWorkExperiencePosition = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].position = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceInstitution = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].institution = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceDepartment = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].department = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceTimestampFrom = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].timestamp_from = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceTimestampTo = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].timestamp_to = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceCity = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].city = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceCountry = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].country = value;
        setWorkExperience(newExperiences);
    };

    const modifyWorkExperienceAdditionalInfo = (index: number, value: string) => {
        let newExperiences = [...workExperience];
        newExperiences[index].additional_info = value;
        setWorkExperience(newExperiences);
    };

    const removeEducationField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...educations]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setEducations(copy);
    };

    const addWorkExperienceField = (e: FormEvent) => {
        e.preventDefault();
        setWorkExperience([
            ...workExperience,
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
    };

    const removeWorkExperienceField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...workExperience]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setWorkExperience(copy);
    };

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
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-between'}>
                                        <button
                                            type="submit"
                                            disabled={session?.user.orcid === undefined}
                                            className={
                                                'flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg disabled:cursor-not-allowed disabled:opacity-40'
                                            }
                                            onClick={(e) => importOrcidProfile(e)}
                                        >
                                            <Image
                                                className="mr-2"
                                                src={'/images/orcid_icon.png'}
                                                width={24}
                                                height={24}
                                                alt={''}
                                            ></Image>
                                            von ORCiD importieren
                                        </button>
                                        <div className="flex justify-end">
                                            <Link href={'/profile'}>
                                                <button
                                                    className={
                                                        'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                    }
                                                >
                                                    Abbrechen
                                                </button>
                                            </Link>
                                            <button
                                                type="submit"
                                                className={
                                                    'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                }
                                            >
                                                Speichern
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Name
                                        </div>
                                        <div className={'flex justify-between'}>
                                            {/* TODO validation: treat first name and last name as required information*/}
                                            <input
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1'
                                                }
                                                type="text"
                                                placeholder={'Vorname'}
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                            />
                                            <input
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1'
                                                }
                                                type="text"
                                                placeholder={'Nachname'}
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Institution
                                        </div>
                                        <input
                                            className={
                                                'border border-gray-500 rounded-lg px-2 py-1 w-1/2'
                                            }
                                            type="text"
                                            placeholder={'Name deiner aktuellen Institution'}
                                            value={institution}
                                            onChange={(e) => setInstitution(e.target.value)}
                                        />
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Bio
                                        </div>
                                        <textarea
                                            className={
                                                'w-full border border-gray-500 rounded-lg px-2 py-1'
                                            }
                                            rows={5}
                                            placeholder={'Erzähle kurz etwas über dich'}
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                        ></textarea>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Fachgebiet
                                        </div>
                                        <input
                                            className={
                                                'border border-gray-500 rounded-lg px-2 py-1 w-1/2'
                                            }
                                            type="text"
                                            placeholder={'Worin liegt deine Expertise?'}
                                            value={expertise}
                                            onChange={(e) => setExpertise(e.target.value)}
                                        />
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Geburtstag
                                        </div>
                                        <input
                                            className={
                                                'border border-gray-500 rounded-lg px-2 py-1'
                                            }
                                            type="date"
                                            value={birthday}
                                            onChange={(e) => setBirthday(e.target.value)}
                                        />
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Sprachen
                                        </div>
                                        <ReactTags
                                            tags={languageTags}
                                            delimiters={delimiters}
                                            handleDelete={handleDeleteLanguage}
                                            handleAddition={handleAdditionLanguage}
                                            handleDrag={handleDragLanguage}
                                            handleTagClick={handleTagClickLanguage}
                                            inputFieldPosition="bottom"
                                            placeholder="Enter, um neue Sprache hinzuzufügen"
                                            classNames={{
                                                tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                                                tagInputField:
                                                    'w-3/4 border border-gray-500 rounded-lg my-4 px-2 py-1',
                                                remove: 'ml-1',
                                            }}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div tabname="VE-Info">
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-end'}>
                                        <Link href={'/profile'}>
                                            <button
                                                className={
                                                    'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                }
                                            >
                                                Abbrechen
                                            </button>
                                        </Link>
                                        <button
                                            type="submit"
                                            className={
                                                'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                            }
                                        >
                                            Speichern
                                        </button>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            VE-Themeninteressen
                                        </div>
                                        {veInterests.map((interest, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'In welchen Themengebieten willst du dich mit VE bewegen?'
                                                }
                                                value={interest}
                                                onChange={(e) =>
                                                    modifyVeInterests(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removeVeInterestInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addVeInterestInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            VE-Zielsetzungen
                                        </div>
                                        {veGoals.map((goal, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'Welche Ziele willst du mit VE erreichen?'
                                                }
                                                value={goal}
                                                onChange={(e) =>
                                                    modifyVeGoals(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removeVeGoalsInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addVeGoalsInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Erfahrungen
                                        </div>
                                        {experience.map((exp, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'Welche Erfahrungen konntest du bereits sammeln?'
                                                }
                                                value={exp}
                                                onChange={(e) =>
                                                    modifyExperience(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removeExperienceInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addExperienceInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            präferierte Formate
                                        </div>
                                        {preferredFormats.map((format, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'In welchen Formaten möchtest du VEs abhalten? z.B. synchron/asynchron/hybrid'
                                                }
                                                value={format}
                                                onChange={(e) =>
                                                    modifyPreferredFormats(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removePreferredFormatsInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addPreferredFormatsInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div tabname="Lehre & Forschung">
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-end'}>
                                        <Link href={'/profile'}>
                                            <button
                                                className={
                                                    'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                }
                                            >
                                                Abbrechen
                                            </button>
                                        </Link>
                                        <button
                                            type="submit"
                                            className={
                                                'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                            }
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
                                            delimiters={delimiters}
                                            handleDelete={handleDeleteResearch}
                                            handleAddition={handleAdditionResearch}
                                            handleDrag={handleDragResearch}
                                            handleTagClick={handleTagClickResearch}
                                            inputFieldPosition="bottom"
                                            placeholder="Enter oder Komma, um neue Sprache hinzuzufügen"
                                            classNames={{
                                                tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                                                tagInputField:
                                                    'w-2/3 border border-gray-500 rounded-lg my-4 px-2 py-1',
                                                remove: 'ml-1',
                                            }}
                                        />
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Lehrveranstaltungen
                                        </div>
                                        {courses.map((course, index) => (
                                            <div
                                                key={index}
                                                className={
                                                    'p-4 my-4 mx-2 bg-slate-200 rounded-3xl shadow-2xl'
                                                }
                                            >
                                                <div className="mt-2 flex">
                                                    <div className="w-1/5 flex items-center">
                                                        <label
                                                            htmlFor="title"
                                                            className="px-2 py-2"
                                                        >
                                                            Titel
                                                        </label>
                                                    </div>
                                                    <div className="w-4/5">
                                                        <input
                                                            type="text"
                                                            name="title"
                                                            value={course.title}
                                                            onChange={(e) =>
                                                                modifyCourseTitle(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Titel der Lehrveranstaltung"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/5 flex items-center">
                                                        <label
                                                            htmlFor="academic_courses"
                                                            className="px-2 py-2"
                                                        >
                                                            Studiengänge
                                                        </label>
                                                    </div>
                                                    <div className="w-4/5">
                                                        <input
                                                            type="text"
                                                            name="academic_courses"
                                                            value={course.academic_courses}
                                                            onChange={(e) =>
                                                                modifyCourseAcademicCourses(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="mehrere durch Komma trennen"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/5 flex items-center">
                                                        <label
                                                            htmlFor="semester"
                                                            className="px-2 py-2"
                                                        >
                                                            Semester
                                                        </label>
                                                    </div>
                                                    <div className="w-4/5">
                                                        <input
                                                            type="text"
                                                            name="semester"
                                                            value={course.semester}
                                                            onChange={(e) =>
                                                                modifyCourseSemester(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
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
                            </div>
                            <div tabname="Ausbildung">
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-end'}>
                                        <Link href={'/profile'}>
                                            <button
                                                className={
                                                    'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                }
                                            >
                                                Abbrechen
                                            </button>
                                        </Link>
                                        <button
                                            type="submit"
                                            className={
                                                'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                            }
                                        >
                                            Speichern
                                        </button>
                                    </div>

                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Ausbildung
                                        </div>
                                        {educations.map((education, index) => (
                                            <div
                                                key={index}
                                                className={
                                                    'p-4 my-4 bg-slate-200 rounded-3xl shadow-2xl'
                                                }
                                            >
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="institution"
                                                            className="px-2 py-2"
                                                        >
                                                            Institution
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="institution"
                                                            value={education.institution}
                                                            onChange={(e) =>
                                                                modifyEducationInstitution(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Name der Bildungseinrichtung"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="degree"
                                                            className="px-2 py-2"
                                                        >
                                                            Abschluss und Fach
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="degree"
                                                            value={education.degree}
                                                            onChange={(e) =>
                                                                modifyEducationDegree(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="z.B. Bachelor/Master/PhD Informatik"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="department"
                                                            className="px-2 py-2"
                                                        >
                                                            Abteilung
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="department"
                                                            value={education.department}
                                                            onChange={(e) =>
                                                                modifyEducationDepartment(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional, Abteilung der Einrichtung, z.B. Fakultät"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="timestampFrom"
                                                            className="px-2 py-2"
                                                        >
                                                            von
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        {/* TODO month/year only date picker*/}
                                                        <input
                                                            type="text"
                                                            name="timestampFrom"
                                                            value={education.timestamp_from}
                                                            onChange={(e) =>
                                                                modifyEducationTimestampFrom(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="timestampTo"
                                                            className="px-2 py-2"
                                                        >
                                                            bis
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3 flex">
                                                        {/* TODO month/year only date picker*/}
                                                        <input
                                                            type="text"
                                                            name="timestampTo"
                                                            value={education.timestamp_to}
                                                            onChange={(e) =>
                                                                modifyEducationTimestampTo(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional"
                                                            className="border border-gray-500 rounded-lg h-12 p-2"
                                                        />
                                                        <div className="w-full flex justify-end items-center mx-2">
                                                            <input
                                                                type="checkbox"
                                                                name="tody"
                                                                className="mx-2"
                                                            />
                                                            <label htmlFor="today">heute</label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="additionalInfo"
                                                            className="px-2 py-2"
                                                        >
                                                            Zusatzinfos
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="additionalInfo"
                                                            value={education.additional_info}
                                                            onChange={(e) =>
                                                                modifyEducationAdditionalInfo(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional, z.B. Note, Spezialisierungen, Thesis-Titel, ..."
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className={'w-full mt-1 px-2 flex justify-end'}>
                                            <button onClick={(e) => removeEducationField(e)}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={(e) => addEducationField(e)}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div tabname="Berufserfahrung">
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-end'}>
                                        <Link href={'/profile'}>
                                            <button
                                                className={
                                                    'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                }
                                            >
                                                Abbrechen
                                            </button>
                                        </Link>
                                        <button
                                            type="submit"
                                            className={
                                                'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                            }
                                        >
                                            Speichern
                                        </button>
                                    </div>

                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Berufserfahrung
                                        </div>
                                        {workExperience.map((workExp, index) => (
                                            <div
                                                key={index}
                                                className={
                                                    'p-4 my-4 bg-slate-200 rounded-3xl shadow-2xl'
                                                }
                                            >
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="position"
                                                            className="px-2 py-2"
                                                        >
                                                            Position
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="position"
                                                            value={workExp.position}
                                                            onChange={(e) =>
                                                                modifyWorkExperiencePosition(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Berufsbezeichnung"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="institution"
                                                            className="px-2 py-2"
                                                        >
                                                            Institution
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="institution"
                                                            value={workExp.institution}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceInstitution(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Name der Institution"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="department"
                                                            className="px-2 py-2"
                                                        >
                                                            Abteilung
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="department"
                                                            value={workExp.department}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceDepartment(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional, z.B. Fakultät der Uni / Abteilung der Firma"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="timestampFrom"
                                                            className="px-2 py-2"
                                                        >
                                                            von
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        {/* TODO month/year only date picker*/}
                                                        <input
                                                            type="text"
                                                            name="timestampFrom"
                                                            value={workExp.timestamp_from}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceTimestampFrom(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="timestampTo"
                                                            className="px-2 py-2"
                                                        >
                                                            bis
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3 flex">
                                                        {/* TODO month/year only date picker*/}
                                                        <input
                                                            type="text"
                                                            name="timestampTo"
                                                            value={workExp.timestamp_to}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceTimestampTo(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional"
                                                            className="border border-gray-500 rounded-lg h-12 p-2"
                                                        />
                                                        <div className="w-full flex justify-end items-center mx-2">
                                                            <input
                                                                type="checkbox"
                                                                name="tody"
                                                                className="mx-2"
                                                            />
                                                            <label htmlFor="today">heute</label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label htmlFor="city" className="px-2 py-2">
                                                            Stadt
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            value={workExp.city}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceCity(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="country"
                                                            className="px-2 py-2"
                                                        >
                                                            Land
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="country"
                                                            value={workExp.country}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceCountry(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="w-1/3 flex items-center">
                                                        <label
                                                            htmlFor="additionalInfo"
                                                            className="px-2 py-2"
                                                        >
                                                            Zusatzinfos
                                                        </label>
                                                    </div>
                                                    <div className="w-2/3">
                                                        <input
                                                            type="text"
                                                            name="additionalInfo"
                                                            value={workExp.additional_info}
                                                            onChange={(e) =>
                                                                modifyWorkExperienceAdditionalInfo(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="optional, z.B. Tätigkeiten"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className={'w-full mt-1 px-2 flex justify-end'}>
                                            <button onClick={(e) => removeWorkExperienceField(e)}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={(e) => addWorkExperienceField(e)}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </form>
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
