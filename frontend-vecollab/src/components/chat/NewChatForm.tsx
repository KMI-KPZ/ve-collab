import { BackendSearchResponse, BackendUserSnippet } from '@/interfaces/api/apiInterfaces';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { FormEvent, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import AsyncSelect from 'react-select/async';

interface Props {
    closeDialogCallback: () => void;
}
export default function NewChatForm({ closeDialogCallback }: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');

    const [members, setMembers] = useState(['']);
    const [usersProfileSnippets, setUsersProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [optionalRoomName, setOptionalRoomName] = useState<string>('');

    const modifyUsers = (index: number, value: string) => {
        let newUsers = [...members];
        newUsers[index] = value;
        setMembers(newUsers);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setMembers([...members, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...members];
        copy.pop();
        setMembers(copy);
    };

    const loadUsers = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // TODO search with delay to reduce network traffic!
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    setUsersProfileSnippets(
                        data.users.reduce(
                            (acc, current, i) => ({ ...acc, [current.username]: current }),
                            {}
                        )
                    );

                    callback(
                        data.users
                            .filter((user) => user.username !== session!.user.preferred_username)
                            .map((user) => ({
                                label:
                                    user.first_name + ' ' + user.last_name + ' - ' + user.username,
                                value: user.username,
                            }))
                    );
                }
            );
        }
    };

    const createNewRoom = () => {
        fetchPOST(
            '/chatroom/create_or_get',
            {
                members: members, // current user will be added by backend
                name: optionalRoomName !== '' ? optionalRoomName : null,
            },
            session?.accessToken
        );
    };

    const getUserLabel = (user: BackendUserSnippet) => {
        return `${user?.first_name} ${user?.last_name} - ${user?.username}`;
    };

    return (
        <div className="relative h-[47vh]">
            <div className="w-[30vw] min-w-96 h-[40vh] overflow-y-auto content-scrollbar relative px-2">
                <h1 className="my-4">{t('add_members_to_chat')}</h1>
                {members.map((member, index) => (
                    <div key={index} className="my-2">
                        <AsyncSelect
                            className="grow max-w-full"
                            instanceId={index.toString()}
                            loadOptions={loadUsers}
                            onChange={(e) => modifyUsers(index, e!.value)}
                            value={
                                member
                                    ? {
                                          label: getUserLabel(usersProfileSnippets[member]),
                                          value: member,
                                      }
                                    : null
                            }
                            placeholder={t('search_users_placeholder')}
                            getOptionLabel={(option) => option.label}
                            loadingMessage={() => t('loading')}
                            noOptionsMessage={() => t('user_search_no_results')}
                            openMenuOnFocus={false}
                            openMenuOnClick={false}
                            components={{
                                DropdownIndicator: null,
                            }}
                        />
                    </div>
                ))}
                <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                    <button onClick={removeInputField}>
                        <RxMinus size={20} />
                    </button>
                    <button onClick={addInputField}>
                        <RxPlus size={20} />
                    </button>
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
            <div className="flex absolute bottom-0 w-full">
                <button
                    className={
                        'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                    }
                    onClick={closeDialogCallback}
                >
                    <span>{t('cancel')}</span>
                </button>
                <button
                    className={
                        'w-40 h-12 bg-ve-collab-orange border border-gray-200 text-white py-3 px-6 rounded-lg shadow-xl'
                    }
                    onClick={(e) => {
                        createNewRoom();
                        closeDialogCallback();
                    }}
                >
                    <span>{t('create')}</span>
                </button>
            </div>
        </div>
    );
}
