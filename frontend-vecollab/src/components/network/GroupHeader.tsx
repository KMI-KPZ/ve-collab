import AuthenticatedImage from '../common/AuthenticatedImage';
import { RxTrash } from 'react-icons/rx';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { fetchDELETE, fetchGET, fetchPOST, useGetGroup } from '@/lib/backend';
import { ChangeEvent, useEffect, useState } from 'react';
import Dialog from '../profile/Dialog';
import Tabs from '../profile/Tabs';
import BoxHeadline from '../common/BoxHeadline';
import AvatarEditor from '../profile/AvatarEditor';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import LoadingAnimation from '../common/LoadingAnimation';
import AsyncCreatableSelect from 'react-select/async-creatable';
import Select from 'react-select';
import { BackendSearchResponse } from '@/interfaces/api/apiInterfaces';
import Dropdown from '../common/Dropdown';
import ButtonSecondary from '../common/buttons/ButtonSecondary';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import { useTranslation } from 'next-i18next';
import VerticalTabs from '../profile/VerticalTabs';

interface Props {
    userIsAdmin: () => boolean;
}

export default function GroupHeader({ userIsAdmin }: Props) {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();
    const { groupId } = router.query;

    const [toggleJoinable, setToggleJoinable] = useState(true);
    const [toggleInvisible, setToggleInvisible] = useState(true);
    const [groupPicFile, setGroupPicFile] = useState('');
    const [updatedDescription, setUpdatedDescription] = useState('');
    const [invitedUser, setInvitedUser] = useState<{ label: string; value: string }>({
        label: '',
        value: '',
    });

    const [chosenPermissionUser, setChosenPermissionUser] = useState<{
        label: string;
        value: string;
    }>({
        label: '',
        value: '',
    });

    const [permissionsLoading, setPermissionsLoading] = useState(false);
    const [currentPermissions, setCurrentPermissions] = useState<{
        post: boolean;
        read_timeline: boolean;
        comment: boolean;
        read_files: boolean;
        write_files: boolean;
    }>({
        post: false,
        read_timeline: true,
        comment: false,
        read_files: false,
        write_files: false,
    });

    const [snippetsLoading, setSnippetsLoading] = useState(true);
    const [profileSnipppets, setProfileSnippets] = useState<UserSnippet[]>([
        { name: '', profilePicUrl: '', institution: '', preferredUsername: '' },
    ]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditImageDialogOpen, setIsEditImageDialogOpen] = useState(false);

    const {
        data: group,
        isLoading,
        error,
        mutate,
    } = useGetGroup(session!.accessToken, groupId as string);

    const handleOpenEditDialog = () => {
        setIsEditDialogOpen(true);
        setUpdatedDescription(group.space_description);
    };

    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
    };

    const handleCloseEditImageDialog = () => {
        setIsEditImageDialogOpen(false);
    };

    /*
    callback that is triggered when the user selects a new group pic in
    the input element. transforms the image to a base64 data uri and sets it
    as groupPicFile
    */
    const onSelectGroupPicFile = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            // on load the reader.result is always an image
            reader.addEventListener('load', () => {
                setGroupPicFile(reader.result as string);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    /*
    upload the newly selected and cropped space picture
    to the backend
    */
    const uploadImage = (blob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function () {
            // transform base64 payload via base64 data uri and stripping the
            // pre-information
            var base64dataUri = reader.result as string;
            const payload = base64dataUri.replace(/^data:image\/[a-z]+;base64,/, '');

            // send to backend and update state with returned _id to be able
            // to retrieve image from uploads endpoint
            fetchPOST(
                `/spaceadministration/space_information?id=${group._id}`,
                {
                    picture: {
                        type: blob.type,
                        payload,
                    },
                },
                session?.accessToken
            ).then((data) => {
                mutate();
            });
        };
    };

    const handleUpdateDescription = () => {
        fetchPOST(
            `/spaceadministration/space_information?id=${group._id}`,
            {
                description: updatedDescription,
            },
            session?.accessToken
        ).then((data) => {
            mutate();
        });
    };

    const toggleVisibility = () => {
        fetchPOST(
            `/spaceadministration/toggle_visibility?id=${group._id}`,
            {},
            session!.accessToken
        );
        setToggleInvisible(!toggleInvisible);
        mutate();
    };

    const toggleJoinability = () => {
        fetchPOST(
            `/spaceadministration/toggle_joinability?id=${group._id}`,
            {},
            session!.accessToken
        );
        setToggleJoinable(!toggleJoinable);
        mutate();
    };

    const leaveGroup = () => {
        fetchDELETE(`/spaceadministration/leave?id=${group._id}`, {}, session!.accessToken)
            .then((response) => {
                // TODO error handling
            })
            .finally(() => {
                router.push('/groups');
            });
    };

    const deleteGroup = () => {
        if (!userIsAdmin()) return;
        fetchDELETE(`/spaceadministration/delete_space?id=${group._id}`, {}, session!.accessToken)
            .then((response) => {
                // TODO error handling
            })
            .finally(() => {
                router.push('/groups');
            });
    };

    function acceptRequest(requestUser: string): void {
        fetchPOST(
            `/spaceadministration/accept_request?id=${group._id}&user=${requestUser}`,
            {},
            session!.accessToken
        ).then((response) => {
            mutate();
        });
    }

    function declineRequest(requestUser: string): void {
        fetchPOST(
            `/spaceadministration/reject_request?id=${group._id}&user=${requestUser}`,
            {},
            session!.accessToken
        ).then((response) => {
            mutate();
        });
    }

    const loadOptions = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    callback(
                        data.users.map((user) => ({
                            label: user.first_name + ' ' + user.last_name + ' - ' + user.username,
                            value: user.username,
                        }))
                    );
                }
            );
        }
    };

    function inviteUserToGroup(value: string) {
        if (value === '') return;
        fetchPOST(
            `/spaceadministration/invite?id=${group._id}&user=${value}`,
            {},
            session!.accessToken
        ).then((response) => {
            mutate();
            setInvitedUser({ label: '', value: '' });
        });
    }

    function revokeInvite(inviteUser: string) {
        fetchPOST(
            `/spaceadministration/revoke_invite?id=${group._id}&user=${inviteUser}`,
            {},
            session!.accessToken
        ).then((response) => {
            mutate();
        });
    }

    function togglePermission(
        permissionKey: 'read_timeline' | 'post' | 'comment' | 'read_files' | 'write_files'
    ) {
        const copy = { ...currentPermissions };
        copy[permissionKey] = !copy[permissionKey];

        fetchPOST(`/space_acl/update`, copy, session?.accessToken).then((data) => {
            setCurrentPermissions(copy);
        });
    }

    function promoteToAdmin() {
        fetchPOST(
            `/spaceadministration/add_admin?id=${group._id}&user=${chosenPermissionUser.value}`,
            {},
            session?.accessToken
        ).then((data) => {
            mutate();
        });
    }

    useEffect(() => {
        if (!isLoading) {
            setToggleInvisible(group.invisible);

            setSnippetsLoading(true);
            fetchPOST(
                '/profile_snippets',
                { usernames: [...group.requests, ...group.invites, ...group.members] },
                session?.accessToken
            ).then((data) => {
                setProfileSnippets(
                    data.user_snippets.map((snippet: any) => ({
                        name: snippet.first_name + ' ' + snippet.last_name,
                        profilePicUrl: snippet.profile_pic,
                        institution: snippet.institution,
                        preferredUsername: snippet.username,
                    }))
                );
                setSnippetsLoading(false);
            });
        }
    }, [isLoading, group, session]);

    useEffect(() => {
        if (chosenPermissionUser.value !== '') {
            setPermissionsLoading(true);
            fetchGET(
                `/space_acl/get?space=${group._id}&username=${chosenPermissionUser.value}`,
                session?.accessToken
            ).then((data) => {
                setCurrentPermissions(data.acl_entry);
                setPermissionsLoading(false);
            });
        }
    }, [chosenPermissionUser, session, group]);

    const handleClickGroupOptions = () => {
        leaveGroup();
    };

    return (
        <>
            {isLoading ? (
                <LoadingAnimation />
            ) : (
                <>
                    <div className={'flex'}>
                        <div
                            className={
                                'mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl w-[180px] h-[180px]'
                            }
                        >
                            <AuthenticatedImage
                                imageId={group.space_pic}
                                alt={t('group_picture')}
                                width={180}
                                height={180}
                            />
                        </div>
                        <div className={'flex grow items-center mt-6 text-slate-900 font-bold'}>
                            <div className={'text-4xl pr-6'}>{group.name}</div>
                        </div>
                        <div className={'flex items-center mt-6'}>
                            <div className="mt-2 min-h-[2rem]">
                                {userIsAdmin() ? (
                                    <ButtonSecondary
                                        onClick={() => handleOpenEditDialog()}
                                        label={t('edit_group')}
                                    />
                                ) : (
                                    <Dropdown
                                        options={[{ value: 'leaveGroup', label: t('leave_group') }]}
                                        onSelect={handleClickGroupOptions}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                    <Dialog
                        isOpen={isEditDialogOpen}
                        title={t('edit_group')}
                        onClose={handleCloseEditDialog}
                    >
                        <div className="w-full h-full min-h-[60vh] min-w-[50vw]">
                            <VerticalTabs>
                                <div tabid="pic_description" tabname={t('pic_and_description')}>
                                    <div className="flex">
                                        <div className="flex justify-center mx-6">
                                            <div className="">
                                                <div className="my-2 rounded-full overflow-hidden w-fit border-black border">
                                                    <AuthenticatedImage
                                                        imageId={group.space_pic}
                                                        alt={t('group_picture')}
                                                        width={180}
                                                        height={180}
                                                    />
                                                </div>
                                                <div className="flex justify-center">
                                                    <ButtonPrimary
                                                        onClick={() =>
                                                            setIsEditImageDialogOpen(true)
                                                        }
                                                        label={t('change')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Dialog
                                            isOpen={isEditImageDialogOpen}
                                            title={t('upload_group_picture')}
                                            onClose={handleCloseEditImageDialog}
                                        >
                                            <div className="my-2 mx-2">
                                                {t('choose_picture_and_cut')}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="my-2"
                                                onChange={onSelectGroupPicFile}
                                                onClick={(e) => {
                                                    e.currentTarget.value = '';
                                                }}
                                            />

                                            {groupPicFile !== '' ? (
                                                <div className="w-[90vw] max-w-[450px] max-h-[85vh]">
                                                    <AvatarEditor
                                                        sourceImg={groupPicFile}
                                                        onFinishUpload={(blob) => {
                                                            uploadImage(blob);
                                                            handleCloseEditImageDialog();
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <></>
                                            )}
                                        </Dialog>
                                        <div className="mx-6 flex flex-grow items-center">
                                            <div className="w-full">
                                                <div
                                                    className={
                                                        'mb-1 font-bold text-slate-900 text-lg'
                                                    }
                                                >
                                                    {t('description')}
                                                </div>
                                                <textarea
                                                    className={
                                                        'w-full border border-[#cccccc] rounded-md px-2 py-[6px]'
                                                    }
                                                    rows={5}
                                                    placeholder={t('description_placeholder')}
                                                    value={updatedDescription}
                                                    onChange={(e) =>
                                                        setUpdatedDescription(e.target.value)
                                                    }
                                                ></textarea>
                                                <ButtonPrimary
                                                    onClick={() => handleUpdateDescription()}
                                                    label={t('common:save')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div tabid="visibility" tabname={t('visibility')}>
                                    <div className="flex mx-4 my-4">
                                        <div className="mx-4">{t('public')}</div>
                                        <div
                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                            onClick={toggleJoinability}
                                        >
                                            <div
                                                className={
                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                    (toggleJoinable
                                                        ? null
                                                        : 'transform translate-x-6')
                                                }
                                            ></div>
                                        </div>
                                        <div className="mx-4">{t('private')}</div>
                                    </div>
                                    <div className="flex mx-4 my-4">
                                        <div className="mx-4">{t('invisible')}</div>
                                        <div
                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                            onClick={toggleVisibility}
                                        >
                                            <div
                                                className={
                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                    (toggleInvisible
                                                        ? null
                                                        : 'transform translate-x-6')
                                                }
                                            ></div>
                                        </div>
                                        <div className="mx-4">{t('visible')}</div>
                                    </div>
                                </div>
                                <div tabid="requests" tabname={t('requests')}>
                                    {group.requests.length === 0 && (
                                        <div className="mx-4 my-4 text-gray-600">
                                            {t('no_requests')}
                                        </div>
                                    )}
                                    <div className="divide-y">
                                        {group.requests.map((requestUser, index) => (
                                            <div key={index} className="flex py-2 justify-between">
                                                <div className="flex cursor-pointer">
                                                    <div>
                                                        <AuthenticatedImage
                                                            imageId={
                                                                profileSnipppets.find(
                                                                    (snippet) =>
                                                                        snippet.preferredUsername ===
                                                                        requestUser
                                                                )?.profilePicUrl ||
                                                                'default_profile_pic.jpg'
                                                            }
                                                            alt={t('profile_picture')}
                                                            width={60}
                                                            height={60}
                                                            className="rounded-full"
                                                        ></AuthenticatedImage>
                                                    </div>
                                                    <div>
                                                        <BoxHeadline
                                                            title={
                                                                profileSnipppets.find(
                                                                    (snippet) =>
                                                                        snippet.preferredUsername ===
                                                                        requestUser
                                                                )?.name || requestUser
                                                            }
                                                        />
                                                        <div className="mx-2 px-1 my-1 text-gray-600">
                                                            {
                                                                profileSnipppets.find(
                                                                    (snippet) =>
                                                                        snippet.preferredUsername ===
                                                                        requestUser
                                                                )?.institution
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <button
                                                        className={
                                                            'h-10 bg-transparent border border-green-600 text-green-600 px-4 mx-2 rounded-lg shadow-xl'
                                                        }
                                                        onClick={(e) => acceptRequest(requestUser)}
                                                    >
                                                        <span>{t('common:accept')}</span>
                                                    </button>
                                                    <button
                                                        className={
                                                            'h-10 bg-transparent border border-red-600 text-red-600 px-4 mx-2 rounded-lg shadow-xl'
                                                        }
                                                        onClick={(e) => declineRequest(requestUser)}
                                                    >
                                                        <span>{t('common:decline')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div tabid="invites" tabname={t('invitations')}>
                                    <div className="flex">
                                        <AsyncCreatableSelect
                                            className="w-3/4"
                                            loadOptions={loadOptions}
                                            onChange={(e) => setInvitedUser(e!)}
                                            value={invitedUser}
                                            placeholder={t('common:search_users')}
                                            getOptionLabel={(option) => option.label}
                                            formatCreateLabel={(inputValue) => (
                                                <span>
                                                    {t('common:search_users_no_hit', {
                                                        value: inputValue,
                                                    })}
                                                </span>
                                            )}
                                        />
                                        <div className="flex w-1/4 justify-center">
                                            <button
                                                className={
                                                    'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                }
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    inviteUserToGroup(invitedUser.value);
                                                }}
                                            >
                                                {t('invite')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="my-4">
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            {t('pending_invitations')}
                                        </div>
                                        {group.invites.length === 0 && (
                                            <div className="mx-4 my-4 text-gray-600">
                                                {t('no_pending_invitations')}
                                            </div>
                                        )}
                                        <div className="divide-y">
                                            {group.invites.map((inviteUser, index) => (
                                                <div
                                                    key={index}
                                                    className="flex py-2 w-1/3 justify-between"
                                                >
                                                    <div className="flex cursor-pointer">
                                                        <div>
                                                            <AuthenticatedImage
                                                                imageId={
                                                                    profileSnipppets.find(
                                                                        (snippet) =>
                                                                            snippet.preferredUsername ===
                                                                            inviteUser
                                                                    )?.profilePicUrl ||
                                                                    'default_profile_pic.jpg'
                                                                }
                                                                alt={t('profile_picture')}
                                                                width={60}
                                                                height={60}
                                                                className="rounded-full"
                                                            ></AuthenticatedImage>
                                                        </div>
                                                        <div>
                                                            <BoxHeadline
                                                                title={
                                                                    profileSnipppets.find(
                                                                        (snippet) =>
                                                                            snippet.preferredUsername ===
                                                                            inviteUser
                                                                    )?.name || inviteUser
                                                                }
                                                            />
                                                            <div className="mx-2 px-1 my-1 text-gray-600">
                                                                {profileSnipppets.find(
                                                                    (snippet) =>
                                                                        snippet.preferredUsername ===
                                                                        inviteUser
                                                                )?.institution || ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <div className="flex items-center">
                                                            <RxTrash
                                                                size={20}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    revokeInvite(inviteUser);
                                                                }}
                                                                className="cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div tabid="permissions" tabname={t('permissions')}>
                                    <div>
                                        {!snippetsLoading && (
                                            <>
                                                <div className="flex">
                                                    <Select
                                                        className="w-3/4"
                                                        options={group.members
                                                            .filter(
                                                                (member: string) =>
                                                                    !group.admins.includes(member)
                                                            )
                                                            .map((user: string) => {
                                                                return {
                                                                    label:
                                                                        profileSnipppets.find(
                                                                            (snippet) =>
                                                                                snippet.preferredUsername ===
                                                                                user
                                                                        )!.name +
                                                                        ' - ' +
                                                                        user,
                                                                    value: user,
                                                                };
                                                            })
                                                            .sort((a, b) =>
                                                                a.label.localeCompare(b.label)
                                                            )}
                                                        onChange={(e) =>
                                                            setChosenPermissionUser(e!)
                                                        }
                                                        value={chosenPermissionUser}
                                                        placeholder={t('common:search_users')}
                                                        getOptionLabel={(option) => option.label}
                                                    />
                                                </div>
                                                <div className="my-4">
                                                    <div
                                                        className={
                                                            'mb-1 font-bold text-slate-900 text-lg'
                                                        }
                                                    >
                                                        {t('adjust_permissions')}
                                                    </div>
                                                    {chosenPermissionUser.value === '' ? (
                                                        <div className="mx-4 my-4 text-gray-600">
                                                            {t('no_user_selected')}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {!permissionsLoading && (
                                                                <>
                                                                    <div className="flex my-4 w-1/4 justify-between">
                                                                        <div>
                                                                            {t(
                                                                                'permission_read_timeline'
                                                                            )}
                                                                        </div>
                                                                        <div
                                                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                                                            onClick={(e) =>
                                                                                togglePermission(
                                                                                    'read_timeline'
                                                                                )
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={
                                                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                                                    (currentPermissions.read_timeline
                                                                                        ? 'transform translate-x-6 bg-green-500'
                                                                                        : null)
                                                                                }
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex my-4 w-1/4 justify-between">
                                                                        <div>
                                                                            {t('permission_post')}
                                                                        </div>
                                                                        <div
                                                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                                                            onClick={(e) =>
                                                                                togglePermission(
                                                                                    'post'
                                                                                )
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={
                                                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                                                    (currentPermissions.post
                                                                                        ? 'transform translate-x-6 bg-green-500'
                                                                                        : null)
                                                                                }
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex my-4 w-1/4 justify-between">
                                                                        <div>
                                                                            {t(
                                                                                'permission_comment'
                                                                            )}
                                                                        </div>
                                                                        <div
                                                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                                                            onClick={(e) =>
                                                                                togglePermission(
                                                                                    'comment'
                                                                                )
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={
                                                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                                                    (currentPermissions.comment
                                                                                        ? 'transform translate-x-6 bg-green-500'
                                                                                        : null)
                                                                                }
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex my-4 w-1/4 justify-between">
                                                                        <div>
                                                                            {t(
                                                                                'permission_read_files'
                                                                            )}
                                                                        </div>
                                                                        <div
                                                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                                                            onClick={(e) =>
                                                                                togglePermission(
                                                                                    'read_files'
                                                                                )
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={
                                                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                                                    (currentPermissions.read_files
                                                                                        ? 'transform translate-x-6 bg-green-500'
                                                                                        : null)
                                                                                }
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex my-4 w-1/4 justify-between">
                                                                        <div>
                                                                            {t(
                                                                                'permission_write_files'
                                                                            )}
                                                                        </div>
                                                                        <div
                                                                            className="md:w-14 md:h-7 w-12 h-6 flex items-center border border-gray-400 rounded-full p-1 cursor-pointer"
                                                                            onClick={(e) =>
                                                                                togglePermission(
                                                                                    'write_files'
                                                                                )
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={
                                                                                    'bg-gray-400 md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                                                                    (currentPermissions.write_files
                                                                                        ? 'transform translate-x-6 bg-green-500'
                                                                                        : null)
                                                                                }
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="mt-10 p-2 w-1/2 rounded-xl border border-red-600">
                                                                <div
                                                                    className={
                                                                        'mb-1 font-bold text-slate-900 text-lg'
                                                                    }
                                                                >
                                                                    {t('promote_admin')}
                                                                </div>
                                                                <div>
                                                                    {t('promote_admin_warning')}
                                                                </div>
                                                                <button
                                                                    className={
                                                                        'mt-2 bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        promoteToAdmin();
                                                                    }}
                                                                >
                                                                    {t('promote')}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div tabid="leave_group" tabname={t('leave_group')}>
                                    <div className="flex">
                                        <div>
                                            <p className="my-2">
                                                {t('message_last_user_in_space')}
                                            </p>
                                            <button
                                                className={`h-12 border text-white py-3 px-6 rounded-lg shadow ${
                                                    group.members.length == 1
                                                        ? 'bg-orange-300'
                                                        : 'bg-orange-600'
                                                }`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    leaveGroup();
                                                }}
                                                disabled={group.members.length == 1}
                                            >
                                                <span>{t('leave_group')}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {userIsAdmin() ? (
                                    <div tabid="delete_group" tabname={t('delete_group')}>
                                        <div className="flex">
                                            <div>
                                                <p className="my-2 font-bold">
                                                    {t('warning_before_delete_group')}
                                                </p>
                                                <button
                                                    className={
                                                        'h-12 bg-red-500 border text-white py-3 px-6 rounded-lg shadow'
                                                    }
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        deleteGroup();
                                                    }}
                                                >
                                                    <span>{t('delete_group')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <></>
                                )}
                            </VerticalTabs>
                        </div>
                    </Dialog>
                </>
            )}
        </>
    );
}
