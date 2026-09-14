import { BackendChatroomSnippet, BackendSearchResponse } from '@/interfaces/api/apiInterfaces';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState } from 'react';
import { RxMinus } from 'react-icons/rx';
import AsyncSelect from 'react-select/async';
import ButtonLight from '../common/buttons/ButtongLight';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import printUsername from '../common/Username';
import requestDebounce from '../common/requestDebounce';
import UserProfileImage from '../network/UserProfileImage';

interface Props {
    room: BackendChatroomSnippet;
    memberProfileSnippets: UserSnippet[];
    // reports the room back with the changes applied, so that the surrounding
    // components can update their state without having to await a refetch
    roomUpdatedCallback: (room: BackendChatroomSnippet) => void;
    closeDialogCallback: () => void;
}

export default function EditChatRoomForm({
    room,
    memberProfileSnippets,
    roomUpdatedCallback,
    closeDialogCallback,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');

    const [name, setName] = useState<string>(room.name || '');
    const [newMembers, setNewMembers] = useState<{ label: string; value: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<boolean>(false);

    const nameChanged = name.trim() !== (room.name || '');
    const hasChanges = nameChanged || newMembers.length > 0;

    const loadUsers = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        if (inputValue.length < 3) return;
        requestDebounce(() => {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    if (!data.users) return;

                    callback(
                        data.users
                            // users that already are members (or are about to be added)
                            // must not be offered again
                            .filter(
                                (user) =>
                                    !room.members.includes(user.username) &&
                                    !newMembers.find((member) => member.value === user.username)
                            )
                            .map((user) => ({
                                label: printUsername(user, false) as string,
                                value: user.username,
                            }))
                    );
                }
            );
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(false);

        // start from the current state of the room and apply whatever the
        // requests report back, to keep the displayed room in sync
        let updatedRoom: BackendChatroomSnippet = { ...room };

        if (nameChanged) {
            const response = await fetchPOST(
                '/chatroom/rename',
                { room_id: room._id, name: name.trim() },
                session?.accessToken
            );
            if (!response?.success) {
                setError(true);
                setIsSubmitting(false);
                return;
            }
            updatedRoom = { ...updatedRoom, name: response.name };
        }

        if (newMembers.length) {
            const response = await fetchPOST(
                '/chatroom/add_members',
                { room_id: room._id, members: newMembers.map((member) => member.value) },
                session?.accessToken
            );
            if (!response?.success) {
                // a rename before this may already have gone through, so report
                // it back instead of losing it
                roomUpdatedCallback(updatedRoom);
                setError(true);
                setIsSubmitting(false);
                return;
            }
            updatedRoom = { ...updatedRoom, members: response.members };
        }

        roomUpdatedCallback(updatedRoom);
        closeDialogCallback();
    };

    return (
        <>
            <div className="w-[30vw] min-w-96 max-h-[70vh] min-h-[42vh] overflow-y-auto content-scrollbar relative px-2">
                <div>
                    <h1 className="my-4">{t('edit_chat_name')}</h1>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md w-full px-2 py-1"
                        value={name}
                        placeholder={t('chat_name_placeholder')}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <h1 className="my-4">{t('chat_members')}</h1>
                {/* the users that already are members cannot be removed again,
                only newly added ones can be taken off the list before saving */}
                {room.members.map((member) => {
                    const profileSnippet = memberProfileSnippets.find(
                        (snippet) => snippet.preferredUsername === member
                    );
                    return (
                        <div key={member} className="flex items-center px-4 py-2 min-w-56">
                            <Link
                                href={`/profile/user/${member}`}
                                target="_blank"
                                className="flex items-center"
                            >
                                <UserProfileImage
                                    profile_pic={profileSnippet?.profilePicUrl}
                                    chosen_achievement={profileSnippet?.chosen_achievement}
                                />
                                <span className="mx-2">{profileSnippet?.name || member}</span>
                            </Link>
                        </div>
                    );
                })}

                {newMembers.map((member, index) => (
                    <div key={member.value} className="flex items-center px-4 py-2 min-w-56">
                        <Link
                            href={`/profile/user/${member.value}`}
                            target="_blank"
                            className="flex items-center"
                        >
                            <UserProfileImage />
                            <span className="mx-2">{member.label}</span>
                        </Link>
                        <ButtonLight
                            onClick={() =>
                                setNewMembers((prev) => prev.filter((_, i) => i !== index))
                            }
                            label={<RxMinus size={18} />}
                            className="ml-2 !rounded-full"
                        />
                    </div>
                ))}

                <div className="my-2">
                    <AsyncSelect
                        className="grow max-w-full cursor-text"
                        loadOptions={loadUsers}
                        isClearable={true}
                        onChange={(v) => {
                            if (v) setNewMembers((prev) => [...prev, v]);
                        }}
                        value={null}
                        placeholder={t('search_users_placeholder')}
                        loadingMessage={(value) =>
                            value.inputValue.length > 2 ? t('loading') : null
                        }
                        noOptionsMessage={() => t('user_search_no_results')}
                        openMenuOnFocus={false}
                        openMenuOnClick={false}
                        components={{
                            DropdownIndicator: null,
                        }}
                    />
                </div>

                {error && <p className="my-2 text-red-600">{t('edit_chat_error')}</p>}
            </div>
            <div className="flex w-full justify-between">
                <ButtonSecondary onClick={closeDialogCallback} label={t('cancel')} />
                <ButtonPrimary
                    onClick={handleSubmit}
                    label={t('save')}
                    disabled={!hasChanges || isSubmitting}
                />
            </div>
        </>
    );
}
