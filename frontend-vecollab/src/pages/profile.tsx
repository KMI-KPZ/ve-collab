import Container from '@/components/Layout/container';
import PersonalInformation from '@/components/profile/personal-information';
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

interface Props {
    name: string;
    institution: string;
    profilePictureUrl: string;
    bio: string;
    department: string;
    birthday: string;
    languages: string[];
}

export default function Profile() {
    const [name, setName] = useState('');
    const [institution, setInstitution] = useState('');
    const [profilePictureUrl, setProfilePicUrl] = useState('');
    const [bio, setBio] = useState('');
    const [expertise, setExpertise] = useState('');
    const [birthday, setBirthday] = useState('');
    const [languages, setLanguages] = useState(['']);
    const [veInterests, setVeInterests] = useState(['', '']);
    const [veGoals, setVeGoals] = useState(['']);
    const [experience, setExperience] = useState(['']);
    const [preferredFormats, setPreferredFormats] = useState(['']);

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
                    // if the minimum profile data such as first_name and last_name is not set,
                    // chances are high it is after the first register, therefore incentivize user
                    // to fill out his profile by sending him to the edit page
                    // TODO maybe also popup hint on there with some text that says exactly that
                    if (
                        data.profile.first_name === null ||
                        data.profile.last_name === null ||
                        data.profile.first_name === '' ||
                        data.profile.last_name === ''
                    ) {
                        router.push('/editProfile');
                    }
                    console.log(data);

                    setName(data.profile.first_name + ' ' + data.profile.last_name);
                    setProfilePicUrl('/images/random_user.jpg');
                    setInstitution(data.profile.institution);
                    setBio(data.profile.bio);
                    setExpertise(data.profile.expertise);
                    setBirthday(data.profile.birthday);
                    setLanguages(data.profile.languages);
                    setVeInterests(data.profile.ve_interests);
                    setVeGoals(data.profile.ve_goals);
                    setExperience(data.profile.experience);
                    setPreferredFormats(data.profile.preferred_formats);
                }
            });
        } else {
            signIn('keycloak');
        }
    }, [session, status, router]);

    return (
        <>
            <Container>
                <ProfileBanner followsNum={2500} followersNum={3500} />
                <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                    <ProfileHeader
                        name={name}
                        institution={institution}
                        profilePictureUrl={profilePictureUrl}
                    />
                </div>
                <Container>
                    <div className={'mx-20 flex'}>
                        <div className={'w-3/4  mr-4'}>
                            <WhiteBox>
                                <ExtendedPersonalInformation
                                    veInfo={{ veInterests, veGoals, experience, preferredFormats }}
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
                                <PersonalInformation
                                    name={name}
                                    bio={bio}
                                    expertise={expertise}
                                    birthday={birthday}
                                    languages={languages}
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
