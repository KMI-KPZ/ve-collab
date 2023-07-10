import { fetchDELETE, fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HiOutlineShare, HiOutlineTrash } from 'react-icons/hi';
import { format, parse } from 'date-fns';
import { parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import Dialog from '@/components/profile/Dialog';
import EditProfileSuccessAlert from '@/components/profile/EditProfileSuccessAlert';
import Tabs from '@/components/profile/Tabs';
import { UserAccessSnippet, UserSnippet } from '@/interfaces/profile/profileInterfaces';
import AuthenticatedImage from '@/components/profile/AuthenticatedImage';
import BoxHeadline from '@/components/profile/BoxHeadline';
import { RxTrash } from 'react-icons/rx';
import LoadingAnimation from '@/components/LoadingAnimation';

interface PlanPreview {
    _id: string;
    name: string;
    author: string;
    read_access: string[];
    write_access: string[];
    creation_timestamp: string;
    last_modified: string;
}

export default function Overview() {
    const [plans, setPlans] = useState<PlanPreview[]>([]);

    const { data: session, status } = useSession();

    const router = useRouter();

    const [successPopupOpen, setSuccessPopupOpen] = useState(false);

    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareUsername, setShareUsername] = useState('');
    const [shareAccessRight, setShareAccessRight] = useState('write');
    const [userSnippetsLoading, setUserSnippetsLoading] = useState(false);
    const [userSnippets, setUserSnippets] = useState<UserAccessSnippet[]>([]);
    const [shareDialogCurrentPlanId, setShareDialogCurrentPlanId] = useState('');
    const handleOpenShareDialog = (planId: string) => {
        setIsShareDialogOpen(true);
        setShareDialogCurrentPlanId(planId);
        setUserSnippetsLoading(true);

        const plan = plans.filter((plan) => plan._id === planId)[0];
        if (plan !== undefined) {
            // merge read_access and write_access ist without duplicates and without the current user itself
            const joinedUsernamesWithAccess = [
                ...new Set([...plan.read_access, ...plan.write_access]),
            ].filter((username) => username !== session?.user.preferred_username);
            console.log(joinedUsernamesWithAccess);
            // dont make a useless request if no other users have access
            if (joinedUsernamesWithAccess.length > 0) {
                fetchPOST(
                    '/profile_snippets',
                    { usernames: joinedUsernamesWithAccess },
                    session?.accessToken
                ).then((data) => {
                    console.log(data);
                    setUserSnippets(
                        data.user_snippets.map((snippet: any) => ({
                            name: snippet.first_name + ' ' + snippet.last_name,
                            profilePicUrl: snippet.profile_pic,
                            institution: snippet.institution,
                            preferredUsername: snippet.username,
                            access: plan.write_access.includes(snippet.username) ? 'write' : 'read',
                        }))
                    );
                    setUserSnippetsLoading(false);
                });
            } else {
                setUserSnippetsLoading(false);
            }
        }
        console.log(plans);
    };
    const handleCloseShareDialog = () => {
        setUserSnippets([]);
        setIsShareDialogOpen(false);
    };

    const createAndForwardNewPlanner = async () => {
        const newPlanner = await fetchPOST('/planner/insert_empty', {}, session?.accessToken);
        await router.push({
            pathname: '/startingWizard/generalInformation/projectName',
            query: { plannerId: newPlanner.inserted_id },
        });
    };

    const getAllPlans = useCallback(async () => {
        return fetchGET(`/planner/get_available`, session?.accessToken).then((data) => {
            if (data.plans) {
                console.log(data.plans);
                setPlans(data.plans);
            }
        });
    }, [session]);

    const sharePlan = async (planId: string) => {
        const payload = {
            plan_id: planId,
            username: shareUsername,
            read: shareAccessRight === 'read' || shareAccessRight === 'write',
            write: shareAccessRight === 'write',
        };

        console.log(payload);

        await fetchPOST('/planner/grant_access', payload, session?.accessToken).then((data) => {
            console.log(data);
            // render success message that disappears after 2 seconds
            setSuccessPopupOpen(true);
            setTimeout(() => {
                setSuccessPopupOpen((successPopupOpen) => false);
            }, 2000);
        });
    };

    const changeAccessSetting = (
        index: number,
        planId: string,
        username: string,
        access: string
    ) => {
        const payloadRevoke = {
            plan_id: planId,
            username: username,
            read: true,
            write: true,
        };

        // TODO backend needs to have some functionality to switch from one setting to another
        // and not having to revoke first and re-grant new
        fetchPOST('/planner/revoke_access', payloadRevoke, session?.accessToken).then(() => {
            const payloadGrant = {
                plan_id: planId,
                username: username,
                read: true,
                write: access === 'write' ? true : false,
            };
            fetchPOST('/planner/grant_access', payloadGrant, session?.accessToken).then(() => {
                const copy = [
                    ...userSnippets.filter((val, count) => count < index),
                    { ...userSnippets[index], access: access },
                    ...userSnippets.filter((val, count) => count > index),
                ];
                setUserSnippets(copy);
            });
        });
    };

    const revokeAllAccess = (planId: string, username: string, index: number) => {
        const payloadRevoke = {
            plan_id: planId,
            username: username,
            read: true,
            write: true,
        };

        fetchPOST('/planner/revoke_access', payloadRevoke, session?.accessToken).then(() => {
            setUserSnippets([...userSnippets.filter((val, count) => count !== index)]);
        });
    };

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
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            getAllPlans();
        }
    }, [session, status, router, getAllPlans]);

    const deletePlan = async (planId: string, index: number) => {
        const response = await fetchDELETE(
            `/planner/delete?_id=${planId}`,
            {},
            session?.accessToken
        );
        if (response.success === true) {
            let copy = [...plans]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
            copy.splice(index, 1);
            getAllPlans();
        }
    };

    return (
        <>
            <div className="flex justify-center bg-pattern-left-blue-small bg-no-repeat">
                <div className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-content">
                    <div>
                        <div className={'text-center font-bold text-4xl mb-2'}>Übersicht</div>
                        <div className={'text-center mb-20'}>
                            hier findest du alle deine vorhandenen Pläne
                        </div>
                    </div>
                    <div className="flex flex-wrap">
                        {plans.map((plan, index) => (
                            <div key={index} className="m-2">
                                <div className="rounded-lg shadow-md bg-gray-100 w-52 relative">
                                    <div className="p-4">
                                        <h2 className="text-xl font-bold leading-tight text-gray-800">
                                            {plan.name}
                                        </h2>
                                        {plan.author === session?.user.preferred_username ? (
                                            <p className="text-sm text-gray-500">{plan.author}</p>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                freigegeben von {plan.author}
                                            </p>
                                        )}
                                        <div className="mt-3 text-sm">
                                            <div className="text-gray-500">Erstellt:</div>
                                            <time dateTime={plan.creation_timestamp}>
                                                {format(
                                                    parseISO(plan.creation_timestamp),
                                                    'd. MMM yyyy H:mm',
                                                    { locale: de }
                                                )}
                                            </time>
                                        </div>
                                        <div className="mt-3 text-sm">
                                            <div className="text-gray-500">Zuletzt geändert:</div>
                                            <time dateTime={plan.creation_timestamp}>
                                                {format(
                                                    parseISO(plan.last_modified),
                                                    'd. MMM yyyy H:mm',
                                                    { locale: de }
                                                )}
                                            </time>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 flex">
                                        {/* render share button only if user is the author */}
                                        {plan.author === session?.user.preferred_username && (
                                            <>
                                                <button
                                                    className="p-2 flex justify-center items-center"
                                                    onClick={(e) => handleOpenShareDialog(plan._id)}
                                                >
                                                    <HiOutlineShare />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            className="bg-gray-300 rounded-lg p-2 flex justify-center items-center"
                                            onClick={(e) => deletePlan(plan._id, index)}
                                        >
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                    <Link
                                        href={{
                                            pathname:
                                                '/startingWizard/generalInformation/projectName',
                                            query: { plannerId: plan._id },
                                        }}
                                    >
                                        <button className="absolute bottom-0 right-0 bg-ve-collab-orange rounded-lg p-2 flex justify-center items-center">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                height="15"
                                                width="15"
                                            >
                                                <path
                                                    fill="#fff"
                                                    d="M13.4697 17.9697C13.1768 18.2626 13.1768 18.7374 13.4697 19.0303C13.7626 19.3232 14.2374 19.3232 14.5303 19.0303L20.3232 13.2374C21.0066 12.554 21.0066 11.446 20.3232 10.7626L14.5303 4.96967C14.2374 4.67678 13.7626 4.67678 13.4697 4.96967C13.1768 5.26256 13.1768 5.73744 13.4697 6.03033L18.6893 11.25H4C3.58579 11.25 3.25 11.5858 3.25 12C3.25 12.4142 3.58579 12.75 4 12.75H18.6893L13.4697 17.9697Z"
                                                ></path>
                                            </svg>
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                        <Dialog
                            isOpen={isShareDialogOpen}
                            title={`Teilen`}
                            onClose={handleCloseShareDialog}
                        >
                            <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                                <Tabs>
                                    <div tabname="Neu">
                                        <input
                                            type="text"
                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                            placeholder="Nutzernamen eingeben"
                                            value={shareUsername}
                                            onChange={(e) => setShareUsername(e.target.value)}
                                        />
                                        <div className="flex justify-between my-8 mx-6">
                                            <div>
                                                <label className="mx-2">
                                                    <input
                                                        className="mx-2"
                                                        type="radio"
                                                        name="access"
                                                        id="readInput"
                                                        value="read"
                                                        defaultChecked={shareAccessRight === 'read'}
                                                        onChange={(e) =>
                                                            setShareAccessRight(e.target.value)
                                                        }
                                                    />
                                                    Lesen
                                                </label>
                                            </div>
                                            <div>
                                                <label className="mx-2">
                                                    <input
                                                        className="mx-2"
                                                        type="radio"
                                                        name="access"
                                                        id="writeInput"
                                                        value={'write'}
                                                        defaultChecked={
                                                            shareAccessRight === 'write'
                                                        }
                                                        onChange={(e) =>
                                                            setShareAccessRight(e.target.value)
                                                        }
                                                    />
                                                    Lesen & Schreiben
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex absolute bottom-0 w-full">
                                            <button
                                                className={
                                                    'bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                                                }
                                                onClick={handleCloseShareDialog}
                                            >
                                                <span>Abbrechen</span>
                                            </button>
                                            <button
                                                className={
                                                    'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                                                }
                                                onClick={(e) => {
                                                    sharePlan(shareDialogCurrentPlanId);
                                                    handleCloseShareDialog();
                                                }}
                                            >
                                                <span>Absenden</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div tabname="Verwalten">
                                        {userSnippetsLoading ? (
                                            <div className="flex w-full h-full justify-center items-center">
                                                <LoadingAnimation />
                                            </div>
                                        ) : (
                                            <ul className="px-1 divide-y">
                                                {userSnippets.length > 0 ? (
                                                    <>
                                                        {userSnippets.map((snippet, index) => (
                                                            <li key={index} className="py-2">
                                                                <div
                                                                    className="flex cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        router.push(
                                                                            `/profile?username=${snippet.preferredUsername}`
                                                                        );
                                                                        handleCloseShareDialog();
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <AuthenticatedImage
                                                                            imageId={
                                                                                snippet.profilePicUrl
                                                                            }
                                                                            alt={'Profilbild'}
                                                                            width={60}
                                                                            height={60}
                                                                            className="rounded-full"
                                                                        ></AuthenticatedImage>
                                                                    </div>
                                                                    <div>
                                                                        <BoxHeadline
                                                                            title={snippet.name}
                                                                        />
                                                                        <div className="mx-2 px-1 my-1 text-gray-600">
                                                                            {snippet.institution}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center my-2 mx-2 justify-between">
                                                                    <div>
                                                                        <label className="mx-2">
                                                                            <input
                                                                                className="mx-2"
                                                                                type="radio"
                                                                                name={
                                                                                    'access' +
                                                                                    snippet.preferredUsername
                                                                                }
                                                                                id="readInput"
                                                                                value="read"
                                                                                defaultChecked={
                                                                                    snippet.access ===
                                                                                    'read'
                                                                                }
                                                                                onChange={(e) =>
                                                                                    changeAccessSetting(
                                                                                        index,
                                                                                        shareDialogCurrentPlanId,
                                                                                        snippet.preferredUsername,
                                                                                        //todo state from usersnippet
                                                                                        e.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                            Lesen
                                                                        </label>
                                                                    </div>
                                                                    <div>
                                                                        <label className="mx-2">
                                                                            <input
                                                                                className="mx-2"
                                                                                type="radio"
                                                                                name={
                                                                                    'access' +
                                                                                    snippet.preferredUsername
                                                                                }
                                                                                id="writeInput"
                                                                                value={'write'}
                                                                                defaultChecked={
                                                                                    snippet.access ===
                                                                                    'write'
                                                                                }
                                                                                onChange={(e) =>
                                                                                    changeAccessSetting(
                                                                                        index,
                                                                                        shareDialogCurrentPlanId,
                                                                                        snippet.preferredUsername,
                                                                                        e.target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />
                                                                            Lesen & Schreiben
                                                                        </label>
                                                                    </div>

                                                                    <div className="flex items-center">
                                                                        <RxTrash
                                                                            size={20}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                revokeAllAccess(
                                                                                    shareDialogCurrentPlanId,
                                                                                    snippet.preferredUsername,
                                                                                    index
                                                                                );
                                                                            }}
                                                                            className="cursor-pointer"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-center mt-10 text-gray-400 text-2xl">
                                                        Niemand anderes hat Zugang
                                                    </div>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </Tabs>
                            </div>
                        </Dialog>
                    </div>
                    <div className="flex justify-around w-full">
                        {session && (
                            <div>
                                <button
                                    onClick={createAndForwardNewPlanner}
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    neuen Plan starten
                                </button>
                            </div>
                        )}
                        {!session && (
                            <div>
                                <button
                                    disabled
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Logge dich ein, um einen neuen Plan zu erstellen!
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {successPopupOpen && <EditProfileSuccessAlert message={'Plan freigegeben'} />}
        </>
    );
}
