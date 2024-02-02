import { UserAccessSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST } from '@/lib/backend';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import LoadingAnimation from '../LoadingAnimation';
import EditAccessUserSnippet from './EditAccessUserSnippet';

interface Props {
    closeDialogCallback: () => void;
    plan: PlanPreview;
    setSuccessPopupOpen: Dispatch<SetStateAction<boolean>>;
    setSuccessMessage: Dispatch<SetStateAction<string>>;
}

export default function EditAccessList({
    closeDialogCallback,
    plan,
    setSuccessPopupOpen,
    setSuccessMessage,
}: Props) {
    const { data: session } = useSession();

    const [userSnippetsLoading, setUserSnippetsLoading] = useState(false);
    const [userSnippets, setUserSnippets] = useState<UserAccessSnippet[]>([]);

    useEffect(() => {
        setUserSnippetsLoading(true);

        // merge read_access and write_access list without duplicates
        // and without the current user itself
        const joinedUsernamesWithAccess = [
            ...new Set([...plan.read_access, ...plan.write_access]),
        ].filter((username) => username !== session?.user.preferred_username);

        // exchange the usernames for profile snippets,
        // but only if there really are other users with access
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
    }, [plan, session]);

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
                    userSnippets.find((val, count) => val.preferredUsername === username)!
                );
                const copy = [
                    ...userSnippets.filter((val, count) => count !== index),
                    { ...userSnippets[index], access: access },
                ];
                setUserSnippets(copy);

                // render success message that disappears after 2 seconds
                setSuccessPopupOpen(true);
                setSuccessMessage('Freigabeeinstellung geändert');
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
            setSuccessMessage('Freigabe entzogen');
            setTimeout(() => {
                setSuccessPopupOpen((successPopupOpen) => false);
            }, 2000);
        });
    };

    return (
        <>
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
                                    closeDialogCallback={closeDialogCallback}
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
        </>
    );
}
