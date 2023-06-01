import Container from '@/components/Layout/container';
import PersonalData from '@/components/profile/PersonalData';
import ProfileBanner from '@/components/profile/profile-banner';
import ProfileHeader from '@/components/profile/profile-header';
import WhiteBox from '@/components/Layout/WhiteBox';
import VEVitrine from '@/components/profile/VEVitrine';
import ExtendedPersonalInformation from '@/components/profile/ExtendedPersonalInformation';
import BoxHeadline from '@/components/profile/BoxHeadline';
import { useEffect, useState } from 'react';
import { fetchGET } from '@/lib/backend';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
    Course,
    Education,
    WorkExperience,
    PersonalInformation,
    VEInformation,
} from '@/interfaces/profile/profileInterfaces';

export default function Profile() {
    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>({
        firstName: '',
        lastName: '',
        institution: '',
        bio: '',
        expertise: '',
        birthday: '',
        languageTags: [],
    });
    const [profilePictureUrl, setProfilePicUrl] = useState('');
    const [veInformation, setVeInformation] = useState<VEInformation>({
        veInterests: [''],
        veGoals: [''],
        experience: [''],
        preferredFormats: [''],
    });
    const [researchTags, setResearchTags] = useState(['']);
    const [courses, setCourses] = useState<Course[]>([
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

    const [foreignUser, setForeignUser] = useState(false);

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
            // determine if we are watching the profile of a foreign user or my own
            // by checking for a username query parameter and comparing against
            // the user stored in the session
            let username = '';
            if (router.query.username) {
                username = router.query.username as string;
                if (username !== session.user.preferred_username) {
                    setForeignUser((prev) => {
                        return true;
                    });
                } else {
                    setForeignUser((prev) => {
                        return false;
                    });
                }
            } else {
                setForeignUser((prev) => {
                    return false;
                });
            }

            // fetch profile information of the determined user
            fetchGET(`/profileinformation?username=${username}`, session?.accessToken).then(
                (data) => {
                    setLoading(false);
                    if (data) {
                        // if the minimum profile data such as first_name and last_name is not set,
                        // chances are high it is after the first register, therefore incentivize user
                        // to fill out his profile by sending him to the edit page
                        // TODO maybe also popup hint on there with some text that says exactly that.

                        // foreignUser state always says false in the first pass, so gotta check manually -.-
                        if (username == '' || username == session.user.preferred_username) {
                            if (
                                data.profile.first_name === null ||
                                data.profile.last_name === null ||
                                data.profile.first_name === '' ||
                                data.profile.last_name === ''
                            ) {
                                router.push('/editProfile');
                            }
                        }
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
                        setProfilePicUrl(data.profile.profile_pic);
                        setVeInformation({
                            veInterests: data.profile.ve_interests,
                            veGoals: data.profile.ve_goals,
                            experience: data.profile.experience,
                            preferredFormats: data.profile.preferred_formats,
                        });

                        setResearchTags(data.profile.research_tags);
                        setCourses(data.profile.courses);
                        setEducations(data.profile.educations);
                        setWorkExperience(data.profile.work_experience);
                    }
                }
            );
        } else {
            signIn('keycloak');
        }
    }, [session, status, router, foreignUser]);

    return (
        <>
            <Container>
                <ProfileBanner followsNum={2500} followersNum={3500} />
                <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                    <ProfileHeader
                        name={personalInformation.firstName + ' ' + personalInformation.lastName}
                        institution={personalInformation.institution}
                        profilePictureUrl={profilePictureUrl}
                        foreignUser={foreignUser}
                    />
                </div>
                <Container>
                    <div className={'mx-20 flex'}>
                        <div className={'w-3/4  mr-4'}>
                            <WhiteBox>
                                <ExtendedPersonalInformation
                                    veInfo={veInformation}
                                    researchAndTeachingInfo={{
                                        researchInterests: researchTags,
                                        courses,
                                    }}
                                    cvInfo={{ educations, workExperience }}
                                />
                            </WhiteBox>
                            <WhiteBox>
                                <div className={'h-96'}>
                                    {' '}
                                    {/* remove height once content is implemented to avoid unexpected overflow */}
                                    <BoxHeadline title={'Timeline?'} />
                                </div>
                            </WhiteBox>
                        </div>
                        <div className={'w-1/4  ml-4'}>
                            <WhiteBox>
                                <PersonalData
                                    name={
                                        personalInformation.firstName +
                                        ' ' +
                                        personalInformation.lastName
                                    }
                                    bio={personalInformation.bio}
                                    expertise={personalInformation.expertise}
                                    birthday={personalInformation.birthday}
                                    languages={personalInformation.languageTags.map(
                                        (tag) => tag.text
                                    )}
                                />
                            </WhiteBox>
                            <WhiteBox>
                                <VEVitrine />
                            </WhiteBox>
                        </div>
                    </div>
                </Container>
            </Container>
        </>
    );
}
