import Link from 'next/link';
import { RxDotFilled, RxDotsVertical } from 'react-icons/rx';
import { fetchDELETE, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import Dialog from './Dialog';
import PublicPlansSelect from './PublicPlansSelect';
import Alert from '../Alert';

interface Props {
    name: string;
    institution: string;
    profilePictureUrl: string;
    foreignUser: boolean;
    followers: string[];
    veReady: boolean;
}

ProfileHeader.auth = true;
export default function ProfileHeader({
    name,
    institution,
    profilePictureUrl,
    foreignUser,
    followers,
    veReady,
}: Props) {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);

    const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
    const handleOpenInvitationDialog = () => {
        setIsInvitationDialogOpen(true);
    };
    const handleCloseInvitationDialog = () => {
        setIsInvitationDialogOpen(false);
    };

    const [appendPlanCheckboxChecked, setAppendPlanCheckboxChecked] = useState(false);
    const [chosenPlanId, setChosenPlanId] = useState('');
    const [veInvitationMessage, setVeInvitationMessage] = useState('');

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

    const sendVeInvitation = () => {
        const payload = {
            message: veInvitationMessage,
            plan_id: chosenPlanId === '' ? null : chosenPlanId,
            username: usernameOfProfileOwner,
        };

        fetchPOST('/ve_invitation/send', payload, session?.accessToken).then((response) => {
            console.log(response);
            setSuccessPopupOpen(true);
        });
    };

    return (
        <div className={'flex'}>
            <div className={'mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl'}>
                <AuthenticatedImage
                    imageId={profilePictureUrl}
                    alt={'Profilbild'}
                    width={180}
                    height={180}
                />
            </div>
            <div className={'mr-auto'}>
                <div className="mt-2 min-h-[2rem]">
                    {!foreignUser && (
                        <>
                            <Link href={'/profile/edit'}>
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
                <div className="flex mx-16 h-12 items-center">
                    {veReady ? (
                        <>
                            <RxDotFilled
                                size={50}
                                className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,1)]"
                            />
                            <div className="flex items-center text-green-600">
                                für VE&apos;s verfügbar
                            </div>
                        </>
                    ) : (
                        <>
                            <RxDotFilled
                                size={50}
                                className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,1)]"
                            />
                            <div className="flex items-center text-red-600">
                                zur Zeit keine VE&apos;s
                            </div>
                        </>
                    )}
                </div>
                {/* we only render follow and message buttons if it is not our own profile*/}
                {foreignUser && (
                    <>
                        {/* determine if current session user already follow the user behind the profile and render the follow button accordingly*/}
                        {followers.includes(session?.user.preferred_username as string) ? (
                            <button
                                className={
                                    'w-40 h-12 bg-ve-collab-blue/10 border border-ve-collab-blue py-3 px-6 mr-2 rounded-lg shadow-lg'
                                }
                                onClick={unfollowUser}
                            >
                                {' '}
                                <span>gefolgt</span>
                            </button>
                        ) : (
                            <button
                                className={
                                    'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-2 rounded-lg shadow-lg'
                                }
                                onClick={followUser}
                            >
                                {' '}
                                <span>Folgen</span>
                            </button>
                        )}
                        <button
                            className={
                                'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                e.preventDefault();
                                handleOpenInvitationDialog();
                            }}
                        >
                            {' '}
                            <span>VE-Einladung</span>
                        </button>
                        {/* <button className={'h-12 ml-2'}>
                            <span>
                                <RxDotsVertical size={30} color={''} />
                            </span>
                        </button> */}
                        <Dialog
                            isOpen={isInvitationDialogOpen}
                            title={`zum VE einladen`}
                            onClose={handleCloseInvitationDialog}
                        >
                            <div className="w-[30rem] h-[26rem] overflow-y-auto content-scrollbar relative">
                                <div>Nachricht:</div>
                                <textarea
                                    className={
                                        'w-full border border-gray-500 rounded-lg px-2 py-1 my-1'
                                    }
                                    rows={5}
                                    placeholder={
                                        'Beschreibe, worum es in deinem VE gehen soll. Das erhöht die Chance, dass die Person annimmt!'
                                    }
                                    value={veInvitationMessage}
                                    onChange={(e) => setVeInvitationMessage(e.target.value)}
                                ></textarea>
                                <div className="flex mb-2 mt-4">
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={appendPlanCheckboxChecked}
                                        onChange={(e) =>
                                            setAppendPlanCheckboxChecked(!appendPlanCheckboxChecked)
                                        }
                                    />
                                    <p>vorhandenen Plan anhängen</p>
                                </div>
                                {appendPlanCheckboxChecked && (
                                    <>
                                        <PublicPlansSelect
                                            chosenPlanId={chosenPlanId}
                                            setChosenPlanId={setChosenPlanId}
                                        />
                                        <p className="my-2 text-gray-400">
                                            es werden automatisch Leserechte an eingeladene Personen
                                            vergeben!
                                        </p>
                                    </>
                                )}

                                <div className="flex absolute bottom-0 w-full">
                                    <button
                                        className={
                                            'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                                        }
                                        onClick={handleCloseInvitationDialog}
                                    >
                                        <span>Abbrechen</span>
                                    </button>
                                    <button
                                        className={
                                            'w-40 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                                        }
                                        onClick={(e) => {
                                            sendVeInvitation();
                                            handleCloseInvitationDialog();
                                        }}
                                    >
                                        <span>Absenden</span>
                                    </button>
                                </div>
                            </div>
                        </Dialog>
                        {successPopupOpen && <Alert message='Einladung gesendet' autoclose={2000} onClose={() => setSuccessPopupOpen(false)} />}
                    </>
                )}
            </div>
        </div>
    );
}
