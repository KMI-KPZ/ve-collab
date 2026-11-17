import { BackendChatroomSnippet } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST } from '@/lib/backend';
import { useEffect, useRef, useState } from 'react';

/**
 * profile snippets of all members of the given rooms. Only fetches while `enabled`
 * (e.g. while the chat window is open) and only usernames it hasn't requested yet.
 */
export function useChatProfileSnippets(
    rooms: BackendChatroomSnippet[],
    loadingRooms: boolean,
    enabled: boolean,
    accessToken?: string
): { profileSnippets: UserSnippet[]; isLoading: boolean } {
    const [profileSnippets, setProfileSnippets] = useState<UserSnippet[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // usernames we already requested snippets for. keeping track of the request instead of
    // the response prevents a fetch loop in case the backend has no snippet for a username
    const requestedProfileSnippets = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (loadingRooms || !enabled) return;

        // edge case: having no rooms would cause loading animation to spin indefinitely
        // because of initial true state
        if (rooms.length === 0) {
            setIsLoading(false);
            return;
        }

        // filter a distinct list of usernames from the room snippets, skipping those
        // that were already requested. rooms may be added to the list at any time (e.g. when
        // somebody starts a new chat with us), so this may well run more than once
        const usernames = Array.from(new Set(rooms.map((room) => room.members).flat())).filter(
            (username) => !requestedProfileSnippets.current.has(username)
        );

        if (!usernames.length) {
            setIsLoading(false);
            return;
        }
        usernames.forEach((username) => requestedProfileSnippets.current.add(username));

        // fetch profile snippets
        fetchPOST('/profile_snippets', { usernames: usernames }, accessToken).then((data) => {
            setProfileSnippets((prev) => [
                ...prev,
                ...data.user_snippets.map((snippet: any) => {
                    return {
                        profilePicUrl: snippet.profile_pic,
                        name: snippet.first_name + ' ' + snippet.last_name,
                        preferredUsername: snippet.username,
                        institution: snippet.institution,
                    };
                }),
            ]);
            setIsLoading(false);
        });
    }, [loadingRooms, enabled, rooms, accessToken]);

    return { profileSnippets, isLoading };
}
