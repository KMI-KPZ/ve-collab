import { BackendSearchResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { RxMinus } from 'react-icons/rx';
import AsyncSelect from 'react-select/async';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import printUsername from '../common/Username';
import Link from 'next/link';
import UserProfileImage from '../network/UserProfileImage';
import ButtonLight from '../common/buttons/ButtongLight';
import requestDebounce from '../common/requestDebounce';

interface Props {
    closeDialogCallback: () => void;
}
export default function NewChatForm({ closeDialogCallback }: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    const [members, setMembers] = useState<{ label: string; value: string }[]>([]);
    const [usersProfileSnippets, setUsersProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [optionalRoomName, setOptionalRoomName] = useState<string>('');

    const addUser = (label: string, value: string) => {
        setMembers((prev) => [...prev, { label, value }]);
    };

    const removeUser = (index: number) => {
        setMembers((prev) => prev.filter((_, i) => i !== index));
    };

    const loadUsers = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        if (inputValue.length < 3) return;
        requestDebounce(() => {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    if (!data.users) return;
                    setUsersProfileSnippets(
                        data.users.reduce(
                            (acc, current, i) => ({ ...acc, [current.username]: current }),
                            {}
                        )
                    );

                    callback(
                        data.users
                            .filter(
                                (user) =>
                                    user.username !== session!.user.preferred_username &&
                                    !members.find((m) => m.value === user.username)
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

    const createNewRoom = () => {
        if (!members.length) return;
        fetchPOST(
            '/chatroom/create_or_get',
            {
                members: members, // current user will be added by backend
                name: optionalRoomName !== '' ? optionalRoomName : null,
            },
            session?.accessToken
        );
    };

    return (
        <>
            <div className="w-[30vw] min-w-96 h-[30vh] min-h-96 overflow-y-auto content-scrollbar relative px-2">
                <h1 className="my-4">{t('add_members_to_chat')}</h1>
                {members.map((member, index) => {
                    if (!member) return null;
                    return (
                        <div key={index} className="flex items-center px-4 py-2 min-w-56 ">
                            <Link
                                href={`/profile/user/${member.value}`}
                                target="_blank"
                                className="flex items-center"
                            >
                                {usersProfileSnippets[member.value] ? (
                                    <>
                                        <UserProfileImage
                                            profile_pic={
                                                usersProfileSnippets[member.value]?.profile_pic
                                            }
                                            chosen_achievement={
                                                usersProfileSnippets[member.value]
                                                    ?.chosen_achievement
                                            }
                                        />
                                        {printUsername(usersProfileSnippets[member.value])}
                                    </>
                                ) : (
                                    <>{member.label}</>
                                )}
                            </Link>
                            <ButtonLight
                                onClick={() => removeUser(index)}
                                label={<RxMinus size={18} />}
                                className="ml-2 !rounded-full"
                            />
                        </div>
                    );
                })}
                <div className="my-2">
                    <AsyncSelect
                        className="grow max-w-full cursor-text"
                        loadOptions={loadUsers}
                        isClearable={true}
                        onChange={(v) => {
                            if (v) addUser(v.label, v.value);
                        }}
                        value={null}
                        placeholder={t('search_users_placeholder')}
                        // getOptionLabel={(option) => option.label}
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
                <div>
                    <h1 className="my-4">{t('give_chat_name')}</h1>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md w-full px-2 py-1"
                        value={optionalRoomName}
                        onChange={(e) => setOptionalRoomName(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex w-full justify-between">
                <ButtonSecondary onClick={closeDialogCallback} label={t('cancel')} />
                <ButtonPrimary
                    onClick={() => {
                        createNewRoom();
                        closeDialogCallback();
                    }}
                    label={t('create')}
                    disabled={!members.length}
                />
            </div>
        </>
    );
}
