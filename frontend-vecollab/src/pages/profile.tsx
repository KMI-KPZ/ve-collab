import Container from '@/components/Layout/container';
import PersonalData from '@/components/profile/PersonalData';
import ProfileBanner from '@/components/profile/profile-banner';
import ProfileHeader from '@/components/profile/profile-header';
import WhiteBox from '@/components/Layout/WhiteBox';
import VEVitrine from '@/components/profile/VEVitrine';
import ExtendedPersonalInformation from '@/components/profile/ExtendedPersonalInformation';
import BoxHeadline from '@/components/BoxHeadline';
import { useEffect, useState } from 'react';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
    Education,
    WorkExperience,
    PersonalInformation,
    VEInformation,
    VEWindowItem,
    ResearchAndTeachingInformation,
} from '@/interfaces/profile/profileInterfaces';
import Timeline from '@/components/network/Timeline';

Profile.auth = true;
export default function Profile() {
    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>({
        firstName: '',
        lastName: '',
        institution: '',
        bio: '',
        expertise: '',
        birthday: '',
        languages: [],
    });
    const [followers, setFollowers] = useState(['']); // other users that follow this user (usernames)
    const [follows, setFollows] = useState(['']); // the other users that this user follows (usernames)
    const [profilePictureUrl, setProfilePicUrl] = useState('');
    const [veReady, setVeReady] = useState(true);
    const [veInformation, setVeInformation] = useState<VEInformation>({
        veInterests: [''],
        veContents: [''],
        veGoals: [''],
        experience: [''],
        interdisciplinaryExchange: true,
        preferredFormat: '',
    });
    const [researchandTeachingInformation, setResearchAndTeachingInformation] =
        useState<ResearchAndTeachingInformation>({
            researchTags: [''],
            courses: [
                {
                    title: '',
                    academic_courses: '',
                    semester: '',
                },
            ],
            lms: [''],
            tools: [''],
        });
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
    const [veWindowItems, setVeWindowItems] = useState<VEWindowItem[]>([
        {
            plan: {
                _id: '',
                name: '',
            },
            title: '',
            description: '',
        },
    ]);

    const [foreignUser, setForeignUser] = useState(false);

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // determine if we are watching the profile of a foreign user or my own
        // by checking for a username query parameter and comparing against
        // the user stored in the session
        let username = '';
        if (router.query.username) {
            username = router.query.username as string;
            if (username !== session!.user.preferred_username) {
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
        fetchGET(`/profileinformation?username=${username}`, session?.accessToken).then((data) => {
            setLoading(false);
            if (data) {
                // if the minimum profile data such as first_name and last_name is not set,
                // chances are high it is after the first register, therefore incentivize user
                // to fill out his profile by sending him to the edit page
                // TODO maybe also popup hint on there with some text that says exactly that.

                // foreignUser state always says false in the first pass, so gotta check manually -.-
                if (username == '' || username == session!.user.preferred_username) {
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
                    languages: data.profile.languages,
                });
                setFollowers(data.followers);
                setFollows(data.follows);
                setProfilePicUrl(data.profile.profile_pic);
                setVeReady(data.profile.ve_ready);
                setVeInformation({
                    veInterests: data.profile.ve_interests,
                    veContents: data.profile.ve_contents,
                    veGoals: data.profile.ve_goals,
                    experience: data.profile.experience,
                    interdisciplinaryExchange: data.profile.interdisciplinary_exchange,
                    preferredFormat: data.profile.preferred_format,
                });
                setResearchAndTeachingInformation({
                    researchTags: data.profile.research_tags,
                    courses: data.profile.courses,
                    lms: data.profile.lms,
                    tools: data.profile.tools,
                });
                setEducations(data.profile.educations);
                setWorkExperience(data.profile.work_experience);
                setVeWindowItems(
                    data.profile.ve_window.map((elem: any) => ({
                        plan: { _id: elem.plan_id, name: '' },
                        title: elem.title,
                        description: elem.description,
                    }))
                );
            }
        });
    }, [session, router]);

    return (
        <>
            <Container>
                <ProfileBanner
                    follows={follows}
                    setFollows={setFollows}
                    followers={followers}
                    foreignUser={foreignUser}
                    username={personalInformation.firstName + ' ' + personalInformation.lastName}
                />
                <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                    <ProfileHeader
                        name={personalInformation.firstName + ' ' + personalInformation.lastName}
                        institution={personalInformation.institution}
                        profilePictureUrl={profilePictureUrl}
                        foreignUser={foreignUser}
                        followers={followers}
                        veReady={veReady}
                    />
                </div>
                <Container>
                    <div className={'mx-20 flex'}>
                        <div className={'w-3/4  mr-4'}>
                            <WhiteBox>
                                <ExtendedPersonalInformation
                                    veInfo={veInformation}
                                    researchAndTeachingInfo={researchandTeachingInformation}
                                    cvInfo={{ educations, workExperience }}
                                />
                            </WhiteBox>
                            <BoxHeadline title='Timeline' />
                            <Timeline />
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
                                    languages={personalInformation.languages}
                                />
                            </WhiteBox>
                            <WhiteBox>
                                <VEVitrine items={veWindowItems} />
                            </WhiteBox>
                        </div>
                    </div>
                </Container>
            </Container>
        </>
    );
}
