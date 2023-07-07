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
import SuccessAlert from '@/components/profile/SuccessAlert';

interface PlanPreview {
    _id: string;
    name: string;
    author: string;
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
    const handleOpenShareDialog = () => {
        setIsShareDialogOpen(true);
    };
    const handleCloseShareDialog = () => {
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
                                                    onClick={handleOpenShareDialog}
                                                >
                                                    <HiOutlineShare />
                                                </button>
                                                <Dialog
                                                    isOpen={isShareDialogOpen}
                                                    title={`Teilen`}
                                                    onClose={handleCloseShareDialog}
                                                >
                                                    <div className="w-[30rem] h-[28rem] overflow-y-auto content-scrollbar relative">
                                                        <input
                                                            type="text"
                                                            className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                            placeholder="Nutzernamen eingeben"
                                                            value={shareUsername}
                                                            onChange={(e) =>
                                                                setShareUsername(e.target.value)
                                                            }
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
                                                                        defaultChecked={
                                                                            shareAccessRight ===
                                                                            'read'
                                                                        }
                                                                        onChange={(e) =>
                                                                            setShareAccessRight(
                                                                                e.target.value
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
                                                                        name="access"
                                                                        id="writeInput"
                                                                        value={'write'}
                                                                        defaultChecked={
                                                                            shareAccessRight ===
                                                                            'write'
                                                                        }
                                                                        onChange={(e) =>
                                                                            setShareAccessRight(
                                                                                e.target.value
                                                                            )
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
                                                                    sharePlan(plan._id);
                                                                    handleCloseShareDialog();
                                                                }}
                                                            >
                                                                <span>Absenden</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </Dialog>
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
            {successPopupOpen && <SuccessAlert message={'Plan freigegeben'} />}
        </>
    );
}
