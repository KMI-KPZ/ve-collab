import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { HiOutlineShare, HiOutlineTrash } from 'react-icons/hi';
import LoadingAnimation from '../LoadingAnimation';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import { useState } from 'react';
import { UserAccessSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST } from '@/lib/backend';
import SharePlanFormInputs from './SharePlanFormInputs';
import EditAccessUserSnippet from './EditAccessUserSnippet';
import SuccessAlert from '../profile/SuccessAlert';
import { RxArrowRight } from 'react-icons/rx';
import PlanPreviewInformation from './PlanPreviewInformation';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
interface Props {
    plan: PlanPreview;
    deleteCallback: (planId: string) => Promise<void>;
    refetchPlansCallback: () => Promise<void>;
}

export default function PlannerOverviewItem({ plan, deleteCallback, refetchPlansCallback }: Props) {
    const { data: session } = useSession();
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareUsername, setShareUsername] = useState('');
    const [shareAccessRight, setShareAccessRight] = useState('write');
    const [userSnippetsLoading, setUserSnippetsLoading] = useState(false);
    const [userSnippets, setUserSnippets] = useState<UserAccessSnippet[]>([]);
    const handleOpenShareDialog = () => {
        setIsShareDialogOpen(true);
        setUserSnippetsLoading(true);

        // merge read_access and write_access ist without duplicates and without the current user itself
        const joinedUsernamesWithAccess = [
            ...new Set([...plan.read_access, ...plan.write_access]),
        ].filter((username) => username !== session?.user.preferred_username);

        // dont make a useless request if no other users have access
        if (joinedUsernamesWithAccess.length > 0) {
            fetchPOST(
                '/profile_snippets',
                { usernames: joinedUsernamesWithAccess },
                session?.accessToken
            ).then((data) => {
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
    };
    const handleCloseShareDialog = () => {
        // clear out previous snippets, because they will be different on the dialogues of other plans
        setUserSnippets([]);
        setIsShareDialogOpen(false);
        // refetch plans to have all up-to-date information without having to reload the page
        refetchPlansCallback();
    };

    const sharePlan = async () => {
        const payload = {
            plan_id: plan._id,
            username: shareUsername,
            read: shareAccessRight === 'read' || shareAccessRight === 'write',
            write: shareAccessRight === 'write',
        };

        await fetchPOST('/planner/grant_access', payload, session?.accessToken).then((data) => {
            console.log(data);
            // render success message that disappears after 2 seconds
            setSuccessPopupOpen(true);
            setTimeout(() => {
                setSuccessPopupOpen((successPopupOpen) => false);
            }, 2000);
        });
    };

    const changeAccessSetting = (username: string, access: string) => {
        const payloadRevoke = {
            plan_id: plan._id,
            username: username,
            read: true,
            write: true,
        };

        // TODO backend needs to have some functionality to switch from one setting to another
        // and not having to revoke first and re-grant new
        fetchPOST('/planner/revoke_access', payloadRevoke, session?.accessToken).then(() => {
            const payloadGrant = {
                plan_id: plan._id,
                username: username,
                read: true,
                write: access === 'write' ? true : false,
            };
            fetchPOST('/planner/grant_access', payloadGrant, session?.accessToken).then(() => {
                const index = userSnippets.indexOf(
                    userSnippets.filter((val, count) => val.preferredUsername === username)[0]
                );
                const copy = [
                    ...userSnippets.filter((val, count) => val.preferredUsername !== username),
                    { ...userSnippets[index], access: access },
                ];
                setUserSnippets(copy);

                // render success message that disappears after 2 seconds
                setSuccessPopupOpen(true);
                setTimeout(() => {
                    setSuccessPopupOpen((successPopupOpen) => false);
                }, 2000);
            });
        });
    };

    const revokeAllAccess = (username: string) => {
        const payloadRevoke = {
            plan_id: plan._id,
            username: username,
            read: true,
            write: true,
        };

        fetchPOST('/planner/revoke_access', payloadRevoke, session?.accessToken).then(() => {
            setUserSnippets([
                ...userSnippets.filter((val, count) => val.preferredUsername !== username),
            ]);

            // render success message that disappears after 2 seconds
            setSuccessPopupOpen(true);
            setTimeout(() => {
                setSuccessPopupOpen((successPopupOpen) => false);
            }, 2000);
        });
    };

    return (
        <>
            <div className="m-2">
                <div className="rounded-lg shadow-md bg-gray-100 w-52 relative">
                    <PlanPreviewInformation plan={plan} />
                    <div className="absolute top-0 right-0 flex">
                        {/* render share button only if user is the author */}
                        {plan.author === session?.user.preferred_username && (
                            <>
                                <button
                                    className="p-2 flex justify-center items-center"
                                    onClick={(e) => handleOpenShareDialog()}
                                >
                                    <HiOutlineShare />
                                </button>
                            </>
                        )}
                        <button
                            className="bg-gray-300 rounded-lg p-2 flex justify-center items-center"
                            onClick={(e) => deleteCallback(plan._id)}
                        >
                            <HiOutlineTrash />
                        </button>
                    </div>
                    <Link
                        href={{
                            pathname: '/startingWizard/generalInformation/projectName',
                            query: { plannerId: plan._id },
                        }}
                    >
                        <button className="absolute bottom-0 right-0 bg-ve-collab-orange rounded-lg p-2 flex justify-center items-center">
                            <RxArrowRight color="white" />
                        </button>
                    </Link>
                </div>
            </div>
            <Dialog isOpen={isShareDialogOpen} title={`Teilen`} onClose={handleCloseShareDialog}>
                <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                    <Tabs>
                        <div tabname="Neu">
                            <SharePlanFormInputs
                                shareUsername={shareUsername}
                                setShareUsername={setShareUsername}
                                shareAccessRight={shareAccessRight}
                                setShareAccessRight={setShareAccessRight}
                            />
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
                                        sharePlan();
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
                                                <EditAccessUserSnippet
                                                    key={index}
                                                    snippet={snippet}
                                                    closeDialogCallback={handleCloseShareDialog}
                                                    changeAccessCallback={changeAccessSetting}
                                                    revokeAccessCallback={revokeAllAccess}
                                                />
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
            {successPopupOpen && <SuccessAlert message={'Freigabeeinstellung gespeichert'} />}
        </>
    );
}
