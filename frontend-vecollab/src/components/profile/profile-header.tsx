import Link from 'next/link';
import { RxDotsVertical } from 'react-icons/rx';
import ProfileImage from './ProfileImage';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import { useEffect} from 'react';
import { useRouter } from 'next/router';

interface Props {
    name: string;
    institution: string;
    profilePictureUrl: string;
    foreignUser: boolean;
    followers: string[];
}

export default function ProfileHeader({
    name,
    institution,
    profilePictureUrl,
    foreignUser,
    followers,
}: Props) {
    const router = useRouter();
    const { data: session, status } = useSession();
    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    const usernameOfProfileOwner =
        router.query.username !== undefined ? (router.query.username as string) : '';

    const followUser = () => {
        fetchPOST(`/follow?user=${usernameOfProfileOwner}`, {}, session?.accessToken).then(() => {
            // probably a better solution is to control follower state from parent component and
            // manage re-render of follow button by state and not by forcing a refresh and new api requests
            // but for now it works
            router.reload();
        });
    };

    const unfollowUser = () => {
        fetchDELETE(`/follow?user=${usernameOfProfileOwner}`, {}, session?.accessToken).then(() => {
            // probably a better solution is to control follower state from parent component and
            // manage re-render of follow button by state and not by forcing a refresh and new api requests
            // but for now it works
            router.reload();
        });
    };

    return (
        <div className={'flex'}>
            <div className={'mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl'}>
                <ProfileImage profilePicId={profilePictureUrl} />
            </div>
            <div className={'mr-auto'}>
                <div className="mt-2 min-h-[2rem]">
                    {!foreignUser && (
                        <>
                            <Link href={'/editProfile'}>
                                <button
                                    className={
                                        'border border-white bg-black/75 text-white rounded-lg px-3 py-1'
                                    }
                                >
                                    <span>Profil bearbeiten</span>
                                </button>
                            </Link>
                        </>
                    )}
                </div>
                <div className={'mt-11 font-bold text-4xl text-slate-900'}>{name}</div>
                <div className={'text-gray-500'}>{institution}</div>
            </div>
            <div className={'flex items-end mb-12'}>
                {/* we only render follow and message buttons if it is not our own profile*/}
                {foreignUser && (
                    <>
                        {/* determine if current session user already follow the user behind the profile and render the follow button accordingly*/}
                        {followers.includes(session?.user.preferred_username as string) ? (
                            <button
                                className={
                                    'w-32 h-12 bg-green-100 border border-green-500 py-3 px-6 mr-2 rounded-lg shadow-lg'
                                }
                                onClick={unfollowUser}
                            >
                                {' '}
                                <span>gefolgt</span>
                            </button>
                        ) : (
                            <button
                                className={
                                    'w-32 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-2 rounded-lg shadow-lg'
                                }
                                onClick={followUser}
                            >
                                {' '}
                                <span>Folgen</span>
                            </button>
                        )}
                        <button
                            className={
                                'w-32 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                        >
                            {' '}
                            <span>Nachricht</span>
                        </button>
                        <button className={'h-12 ml-2'}>
                            <span>
                                <RxDotsVertical size={30} color={''} />
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
