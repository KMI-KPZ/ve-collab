import PersonalData from '@/components/profile/PersonalData';
import ProfileBanner from '@/components/profile/profile-banner';
import ProfileHeader from '@/components/profile/profile-header';
import WhiteBox from '@/components/common/WhiteBox';
import VEVitrine from '@/components/profile/VEVitrine';
import ExtendedPersonalInformation from '@/components/profile/ExtendedPersonalInformation';
import BoxHeadline from '@/components/common/BoxHeadline';
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
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { Socket } from 'socket.io-client';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';
import Custom404 from '../404';

interface Props {
    socket: Socket;
}

UserProfile.auth = true;
UserProfile.noAuthPreview = <UserProfileNoAuthPreview />;

export default function UserProfile({ socket }: Props): JSX.Element {
    const { t } = useTranslation(['community', 'common']);

    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>({
        firstName: '',
        lastName: '',
        bio: '',
        expertise: '',
        birthday: '',
        languages: [],
        institutions: [],
        chosen_institution_id: '',
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

    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [userExists, setUserExists] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // determine if we are watching the profile of a foreign user or my own
        // by checking for a username query parameter and comparing against
        // the user stored in the session
        let username = '';
        if (router.query.username) {
            username = router.query.username as string;
            if (username !== session!.user.preferred_username) {
                setForeignUser(true);
            } else {
                setForeignUser(false);
            }
        } else {
            setForeignUser(false);
        }

        // fetch profile information of the determined user
        fetchGET(`/profileinformation?username=${username}`, session?.accessToken).then((data) => {
            setLoading(false);
            if (data.profile) {
                setUserExists(true);
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
                        router.push('/profile/edit');
                    }
                }
                setPersonalInformation({
                    firstName: data.profile.first_name,
                    lastName: data.profile.last_name,
                    bio: data.profile.bio,
                    expertise: data.profile.expertise,
                    birthday: data.profile.birthday,
                    languages: data.profile.languages,
                    institutions: data.profile.institutions,
                    chosen_institution_id: data.profile.chosen_institution_id,
                    achievements: data.profile.achievements,
                    chosen_achievement: data.profile.chosen_achievement,
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
                        plan: { _id: elem.plan_id, name: elem.plan_name },
                        title: elem.title,
                        description: elem.description,
                    }))
                );
            }
        });
    }, [session, router]);

    if (loading) return <LoadingAnimation />;
    if (userExists === false) {
        return <Custom404 />;
    }

    return (
        <>
            {loading ? (
                <LoadingAnimation />
            ) : (
                <>
                    <CustomHead
                        pageTitle={t('common:profile')}
                        pageSlug={'profile'}
                        pageDescription={t('profile_description')}
                    />
                    <ProfileBanner
                        follows={follows}
                        setFollows={setFollows}
                        followers={followers}
                        foreignUser={foreignUser}
                        username={
                            personalInformation.firstName + ' ' + personalInformation.lastName
                        }
                    />
                    <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                        <ProfileHeader
                            name={
                                personalInformation.firstName + ' ' + personalInformation.lastName
                            }
                            institution={
                                personalInformation.institutions.find(
                                    (institution) =>
                                        institution._id ===
                                        personalInformation.chosen_institution_id
                                )?.name || ''
                            }
                            profilePictureUrl={profilePictureUrl}
                            foreignUser={foreignUser}
                            followers={followers}
                            chosen_achievement={personalInformation.chosen_achievement}
                            veReady={veReady}
                        />
                    </div>
                    <div className={'mx-20 flex'}>
                        <div className={'w-3/4  mr-4'}>
                            <WhiteBox>
                                <ExtendedPersonalInformation
                                    veInfo={veInformation}
                                    researchAndTeachingInfo={researchandTeachingInformation}
                                    cvInfo={{ educations, workExperience }}
                                />
                            </WhiteBox>
                            <BoxHeadline title="Timeline" />
                            {foreignUser ? (
                                <Timeline socket={socket} user={router.query.username as string} />
                            ) : (
                                <Timeline socket={socket} />
                            )}
                        </div>
                        <div className={'w-1/4  ml-4'}>
                            <WhiteBox>
                                <PersonalData
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
                </>
            )}
        </>
    );
}

export function UserProfileNoAuthPreview() {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('common:profile')}
                pageSlug={'profile'}
                pageDescription={t('profile_description')}
            />
            <ProfileBanner
                follows={[]}
                setFollows={() => {}}
                followers={[]}
                foreignUser={false}
                username={t('common:no_auth.username')}
                isNoAuthPreview={true}
            />
            <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                <ProfileHeader
                    name={t('common:no_auth.username')}
                    institution={t('common:no_auth.institution')}
                    profilePictureUrl={'random_user.jpg'}
                    foreignUser={true}
                    followers={[]}
                    veReady={true}
                    isNoAuthPreview={true}
                />
            </div>
            <div className={'mx-20 flex'}>
                <div className={'w-3/4  mr-4'}>
                    <WhiteBox>
                        <ExtendedPersonalInformation
                            isNoAuthPreview={true}
                            veInfo={{
                                veInterests: [
                                    'Subject-specific Implementation Options',
                                    'Methods and Task Formats',
                                    'Implementation',
                                ],
                                veContents: [
                                    t('common:no_auth.ve_content1'),
                                    t('common:no_auth.ve_content2'),
                                ],
                                veGoals: [
                                    'Promotion of Communicative Competences',
                                    'Interdisciplinary Exchange',
                                    'International Cooperation',
                                ],
                                experience: [t('common:no_auth:ve_experience1')],
                                interdisciplinaryExchange: true,
                                preferredFormat: 'synchronous and asynchronous',
                            }}
                            researchAndTeachingInfo={{
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
                            }}
                            cvInfo={{
                                educations: [
                                    {
                                        institution: '',
                                        degree: '',
                                        department: '',
                                        timestamp_from: '',
                                        timestamp_to: '',
                                        additional_info: '',
                                    },
                                ],
                                workExperience: [
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
                                ],
                            }}
                        />
                    </WhiteBox>
                </div>
                <div className={'w-1/4  ml-4'}>
                    <WhiteBox>
                        <PersonalData
                            bio={'VE Enthusiast'}
                            expertise={'Cultural Studies'}
                            birthday={'1988-01-01'}
                            languages={['English', 'German']}
                        />
                    </WhiteBox>
                </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/75 to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
