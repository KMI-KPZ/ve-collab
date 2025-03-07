import React, { useEffect } from 'react';
import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import BoxHeadline from '@/components/common/BoxHeadline';
import WhiteBox from '@/components/common/WhiteBox';
import Dialog from '@/components/profile/Dialog';
import VerticalTabs from '@/components/profile/VerticalTabs';
import {
    fetchPOST,
    useGetAllGroups,
    useGetMyACL,
    useGetMyGroupInvites,
    useGetMyGroupRequests,
} from '@/lib/backend';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Trans, useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';
import { Tooltip } from '@/components/common/Tooltip';
import { FaRegQuestionCircle } from 'react-icons/fa';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { MdClose, MdSearch } from 'react-icons/md';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';
import ButtonDarkBlue from '@/components/common/buttons/ButtonDarkBlue';
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';
import H2 from '@/components/common/H2';
import { GoAlert } from 'react-icons/go';
import Dropdown from '@/components/common/Dropdown';
import ReportDialog from '@/components/common/dialogs/Report';

Groups.auth = true;
Groups.noAuthPreview = <GroupsNoAuthPreview />;

export default function Groups() {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [searchInput, setSearchInput] = useState('');
    const [newInput, setNewInput] = useState('');
    const [newGroupInvisibleCheckboxChecked, setNewGroupInvisibleCheckboxChecked] = useState(false);
    const [newGroupJoinableCheckboxChecked, setNewGroupJoinableCheckboxChecked] = useState(false);
    // const [searchResults, setSearchResults] = useState<BackendGroup[]>([]);

    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    // const { data: myGroups, mutate: mutateMyGroups } = useGetMyGroups(session!.accessToken);
    const {
        data: allGroups,
        error,
        isLoading: isLoadingAll,
        mutate: mutateAllGroups,
    } = useGetAllGroups(session!.accessToken);

    const [ownOnly, setOwnOnly] = useState<boolean>(true);

    const [groups, setGroups] = useState<BackendGroup[]>();
    useEffect(() => {
        if (isLoadingAll) return;

        // console.log({ allGroups });

        let result = allGroups;
        if (ownOnly) {
            result = result.filter((group) =>
                group.members.includes(session?.user?.preferred_username as string)
            );
        }
        if (searchInput) {
            result = result.filter(
                (group) =>
                    group.name.toLowerCase().includes(searchInput.toLowerCase()) ||
                    group.space_description?.toLowerCase().includes(searchInput.toLowerCase())
            );
        }

        setGroups(result);
    }, [isLoadingAll, allGroups, session?.user, ownOnly, searchInput]);

    const { data: myGroupInvites, mutate: mutateMyGroupInvites } = useGetMyGroupInvites(
        session!.accessToken
    );

    const { data: myGroupRequests, mutate: mutateMyGroupRequests } = useGetMyGroupRequests(
        session!.accessToken
    );

    // console.log({ myGroupInvites, myGroupRequests });

    const { data: myACL } = useGetMyACL(session!.accessToken);

    // const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     setSearchInput(event.target.value);
    //     fetchGET(`/search?spaces=true&query=${event.target.value}`, session!.accessToken).then(
    //         (data) => {
    //             setSearchResults(
    //                 data.spaces.filter((space: BackendGroup) => {
    //                     return !space.members.includes(session!.user?.preferred_username as string);
    //                 })
    //             );
    //         }
    //     );
    // };

    const onClickTabItem = (tab: string) => {
        switch (tab) {
            case 'my_groups':
                setOwnOnly(true);
                break;

            case 'all_groups':
                setOwnOnly(false);
                break;

            default:
                break;
        }
    };

    const handleClickSetOwnOnly = () => {
        setOwnOnly(!ownOnly);
    };

    const handleCloseNewDialog = () => {
        setIsNewDialogOpen(false);
    };

    const handleOpenNewDialog = () => {
        setNewInput('');
        setNewGroupInvisibleCheckboxChecked(false);
        setNewGroupJoinableCheckboxChecked(false);
        setIsNewDialogOpen(true);
    };

    const createNewGroup = () => {
        fetchPOST(
            `/spaceadministration/create?name=${newInput}&invisible=${newGroupInvisibleCheckboxChecked}&joinable=${!newGroupJoinableCheckboxChecked}`,
            {},
            session!.accessToken
        );
        // mutateMyGroups();
        mutateAllGroups();
    };

    function sendJoinRequest(groupId: string): void {
        fetchPOST(`/spaceadministration/join?id=${groupId}`, {}, session!.accessToken).then(
            (data) => {
                // mutateMyGroups();
                mutateAllGroups();
                mutateMyGroupRequests();

                // if group is joinable, user is automatically joined
                // and therefore remove the group from the list
                // if (data.join_type === 'joined') {
                //     searchResults.splice(
                //         searchResults.findIndex((group) => group._id === groupId),
                //         1
                //     );
                // } else if (data.join_type === 'requested_join') {
                //     searchResults
                //         .find((group) => group._id === groupId)!
                //         .requests.push(session!.user.preferred_username!);
                // }
            }
        );
    }

    function acceptInvite(groupId: string): void {
        fetchPOST(
            `/spaceadministration/accept_invite?id=${groupId}`,
            {},
            session!.accessToken
        ).then(() => {
            // mutateMyGroups();
            mutateAllGroups();
            mutateMyGroupInvites();
        });
    }

    function declineInvite(groupId: string): void {
        fetchPOST(
            `/spaceadministration/decline_invite?id=${groupId}`,
            {},
            session!.accessToken
        ).then(() => {
            // mutateMyGroups();
            mutateAllGroups();
            mutateMyGroupInvites();
        });
    }

    function revokeRequest(groupId: string) {
        fetchPOST(
            `/spaceadministration/revoke_request?id=${groupId}`,
            {},
            session!.accessToken
        ).then(() => {
            mutateAllGroups();
            mutateMyGroupRequests();
        });
    }

    const SearchInput = () => (
        <div className="flex items-center">
            <input
                className={
                    'w-1/2 border border-[#cccccc] rounded-md px-2 py-1 active:outline-hidden focus:outline-hidden'
                }
                type="text"
                placeholder={t('search_groups_placeholder')}
                name="search"
                autoComplete="off"
                value={searchInput}
                onChange={(event) => {
                    const value = (event.target as HTMLInputElement).value;
                    setSearchInput(value);
                }}
                autoFocus={isNewDialogOpen ? false : true}
            />
            <div
                onClick={(e) => {
                    setSearchInput('');
                }}
                className={`text-slate-600 inline relative -left-[22px]`}
            >
                <MdClose size={15} className={`${searchInput.length ? 'inline' : 'invisible'}`} />
            </div>
            <button
                type="button"
                title={t('search_title')}
                className="-ml-[22px] rounded-r p-2 flex justify-center items-center inline bg-white border border-gray-300 border-l-transparent"
            >
                <MdSearch className="text-gray-800" />
            </button>
        </div>
    );

    // const Filter = () => (
    //     <>
    //         <div
    //             title={t('groups_filter_own_only_title')}
    //             className={`flex p-2 rounded-full shadow-sm border border-gray-200 cursor-pointer bg-gray-100`}
    //             onClick={handleClickSetOwnOnly}
    //         >
    //             <div className="relative w-[32px] flex items-center ">
    //                 <div
    //                     className={`absolute w-[32px] h-[14px] left-0 rounded-md ${
    //                         ownOnly ? 'bg-green-800' : 'bg-gray-500'
    //                     }`}
    //                 ></div>
    //                 <div
    //                     className={`absolute rounded-full h-[20px] w-[20px] ${
    //                         ownOnly
    //                             ? 'right-0 bg-green-500 drop-shadow-[0_0_3px_rgba(34,197,94,1)]'
    //                             : 'left-0 bg-gray-200'
    //                     }`}
    //                 ></div>
    //             </div>
    //             <span className={`mx-2 ${ownOnly ? '' : 'text-gray-600'}   `}>
    //                 {ownOnly ? t('groups_filter_own_only') : t('all')}
    //             </span>
    //         </div>

    //         <div className="mx-4">
    //             <Dropdown
    //                 options={[
    //                     {
    //                         value: 'own',
    //                         label: t('groups_filter_own'),
    //                     },
    //                     {
    //                         value: 'all',
    //                         label: t('groups_filter_all'),
    //                     },
    //                 ]}
    //                 onSelect={(value) => {
    //                     // handleSwitchAuthorChange(value);
    //                 }}
    //                 icon={
    //                     <span className="flex  items-center">
    //                         {t('group_member')}:{' '}
    //                         <span className="mx-2 text-ve-collab-blue underline">
    //                             {/* {currentAuthorFilter} */}
    //                             {t('groups_filter_own')}
    //                         </span>{' '}
    //                         <MdArrowDropDown />
    //                     </span>
    //                 }
    //                 ulClasses="left-16! right-auto!"
    //             />
    //         </div>
    //     </>
    // );

    const handleSelectOption = (value: string, ...rest: any[]) => {
        switch (value) {
            case 'report':
                setReportDialogOpen(true);
                break;

            default:
                break;
        }
    };

    const GroupDrowndown = () => {
        const options = [
            {
                value: 'report',
                label: t('common:report.report_title'),
                icon: <GoAlert />,
                liClasses: 'text-red-500',
            },
        ];

        return <Dropdown options={options} onSelect={handleSelectOption} />;
    };

    const Item = ({
        group,
        clickable,
        buttons,
    }: {
        group: BackendGroup;
        clickable: boolean;
        buttons: JSX.Element;
    }) => (
        <div className="flex items-center">
            <div className="grow md:basis-5/12 font-normal text-base group truncate flex flex-nowrap items-center justify-between hover:bg-slate-50 px-2">
                {clickable ? (
                    <Link
                        href={`/group/${group._id}`}
                        className="py-2 w-full flex flex-nowrap items-center"
                    >
                        <AuthenticatedImage
                            imageId={group.space_pic}
                            alt={t('group_picture')}
                            width={60}
                            height={60}
                            className="rounded-full mr-2"
                        ></AuthenticatedImage>

                        <div className="flex flex-col truncate">
                            <span className="font-semibold truncate">
                                {group.name}
                                {/* <span className="hidden group-hover:inline-block text-slate-500 mx-4 font-normal">
                            {group.members.length} {t('members')}
                        </span> */}
                            </span>
                            {group.space_description && (
                                <p className="truncate">{group.space_description}</p>
                            )}
                        </div>
                    </Link>
                ) : (
                    <div className="py-2 flex flex-nowrap items-center truncate">
                        <AuthenticatedImage
                            imageId={group.space_pic}
                            alt={t('group_picture')}
                            width={60}
                            height={60}
                            className="rounded-full mr-2"
                        ></AuthenticatedImage>

                        <div className="flex flex-col truncate">
                            <span className="font-semibold truncate">
                                {group.name}
                                {/* <span className="hidden group-hover:inline-block text-slate-500 mx-4 font-normal">
                            {group.members.length} {t('members')}
                        </span> */}
                            </span>
                            {group.space_description && (
                                <p className="truncate">{group.space_description}</p>
                            )}
                        </div>
                    </div>
                )}
                {buttons}
            </div>
            <div className="sm:ml-0 md:ml-2 lg:ml-4">
                <GroupDrowndown />
            </div>
            {reportDialogOpen && (
                <ReportDialog
                    reportedItemId={group._id}
                    reportedItemType="group"
                    closeCallback={() => {
                        setReportDialogOpen(false);
                    }}
                />
            )}
        </div>
    );

    const Items = () => (
        <div className="mx-4 lg:mx-10">
            {!searchInput && groups?.length === 0 && (
                <p className="italic m-2">{t('no_groups_available')}</p>
            )}
            {searchInput && groups?.length === 0 && (
                <p className="italic m-2">{t('no_groups_found')}</p>
            )}
            {groups?.map((group, i) => {
                // user is member
                if (group.members.includes(session!.user.preferred_username!)) {
                    return <Item clickable={true} group={group} key={i} buttons={<></>} />;
                }
                // user is not member
                return (
                    <Item
                        clickable={false}
                        group={group}
                        key={i}
                        buttons={
                            <>
                                {/* group is joinable, render join button */}
                                {group.joinable ? (
                                    <ButtonDarkBlue
                                        onClick={() => {
                                            sendJoinRequest(group._id);
                                        }}
                                    >
                                        {t('join')}
                                    </ButtonDarkBlue>
                                ) : // group is not joinable; user has already requested to join
                                group.requests.includes(session!.user.preferred_username!) ? (
                                    <span className="px-4 py-2 rounded-md shadow-sm border border-gray-200">
                                        {t('join_requested')}
                                    </span>
                                ) : (
                                    // group is not joinable; user has not already requested to join
                                    <ButtonLightBlue
                                        onClick={() => {
                                            sendJoinRequest(group._id);
                                        }}
                                    >
                                        {t('request_join')}
                                    </ButtonLightBlue>
                                )}
                            </>
                        }
                    />
                );
            })}
        </div>
    );

    return (
        <>
            <CustomHead
                pageTitle={t('groups')}
                pageSlug={'groups'}
                pageDescription={t('groups_description')}
            />

            <div className="m-auto p-6 sm:p-12">
                <div className="flex flex-wrap  items-center mb-10 mt-12">
                    <div>
                        <div className={'font-bold text-4xl mb-2'}>{t('groups')}</div>
                        <div className={'text-gray-500 text-xl'}>{t('groups_instructions')}</div>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap-reverse justify-end items-center gap-y-2">
                    {/* <Filter /> */}
                    {/* <div className="flex items-center">
                        <SearchInput />
                    </div> */}

                    {myACL.create_space && (
                        <div className="">
                            <ButtonPrimary onClick={() => handleOpenNewDialog()}>
                                <span>{t('create_new_group')}</span>
                            </ButtonPrimary>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm py-6 px-4 space-x-4">
                    {isLoadingAll ? (
                        <div className="m-12">
                            <LoadingAnimation size="small" />
                        </div>
                    ) : (
                        <VerticalTabs onClickTabItem={onClickTabItem} className="divide-x divide-gray-200">
                            <div tabid="my_groups" tabname={t('my_groups')}>
                                <div className="mx-4 lg:mx-10 my-4">
                                    <SearchInput />
                                </div>
                                <Items />
                            </div>

                            <div tabid="all_groups" tabname={t('common:all')}>
                                <div className="mx-4 lg:mx-10 my-4">
                                    <SearchInput />
                                </div>
                                <Items />
                            </div>

                            <div
                                tabid="requests_invitations"
                                tabname={t('my_requests_and_invitations')}
                            >
                                <div className="mx-4 lg:mx-10">
                                    {myGroupInvites.length == 0 && myGroupRequests.length == 0 && (
                                        <p className="italic m-2">{t('no_current_requests')}</p>
                                    )}

                                    {myGroupInvites.length > 0 && (
                                        <>
                                            <H2>{t('pending_invitations')}</H2>
                                            {myGroupInvites.map((group, i) => (
                                                <Item
                                                    key={i}
                                                    group={group}
                                                    clickable={true}
                                                    buttons={
                                                        <>
                                                            <ButtonPrimary
                                                                onClick={() => {
                                                                    acceptInvite(group._id);
                                                                }}
                                                            >
                                                                {t('common:accept')}
                                                            </ButtonPrimary>

                                                            <ButtonSecondary
                                                                onClick={() => {
                                                                    declineInvite(group._id);
                                                                }}
                                                            >
                                                                {t('common:decline')}
                                                            </ButtonSecondary>
                                                        </>
                                                    }
                                                />
                                            ))}
                                        </>
                                    )}

                                    {myGroupRequests.length > 0 && (
                                        <>
                                            <H2>{t('pending_requests')}</H2>
                                            {myGroupRequests.map((group, i) => (
                                                <Item
                                                    key={i}
                                                    group={group}
                                                    clickable={false}
                                                    buttons={
                                                        <ButtonLightBlue
                                                            onClick={() => {
                                                                revokeRequest(group._id);
                                                            }}
                                                        >
                                                            {t('revoke_request')}
                                                        </ButtonLightBlue>
                                                    }
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </VerticalTabs>
                    )}
                </div>
            </div>
            <Dialog
                isOpen={isNewDialogOpen}
                title={t('create_new_group')}
                onClose={handleCloseNewDialog}
            >
                <div className="w-[25vw] relative">
                    <div>{t('new_group_name')}</div>
                    <input
                        className={'border border-gray-500 rounded-lg px-2 py-1 my-2 w-full'}
                        type="text"
                        placeholder={t('new_group_name_placeholder')}
                        value={newInput}
                        onChange={(e) => setNewInput(e.target.value)}
                        autoFocus
                    />
                    <div className="mt-2">
                        <span className="font-bold">{t('visibility')}:</span>
                        <Tooltip
                            className="mx-2 top-0.5"
                            position="right"
                            tooltipsText={
                                <Trans
                                    i18nKey="group_visibility_tooltip"
                                    ns="community"
                                    components={{ br: <br />, bold: <strong /> }}
                                />
                            }
                        >
                            <FaRegQuestionCircle className="inline m-1 text-ve-collab-blue" />
                        </Tooltip>
                    </div>
                    <div className="flex my-2">
                        <label className="cursor-pointer">
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={newGroupInvisibleCheckboxChecked}
                                onChange={() =>
                                    setNewGroupInvisibleCheckboxChecked(
                                        !newGroupInvisibleCheckboxChecked
                                    )
                                }
                            />
                            {t('invisible')}
                        </label>
                    </div>
                    <div className="flex my-2">
                        <label className="cursor-pointer">
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={newGroupJoinableCheckboxChecked}
                                onChange={() =>
                                    setNewGroupJoinableCheckboxChecked(
                                        !newGroupJoinableCheckboxChecked
                                    )
                                }
                            />
                            {t('private')}
                        </label>
                    </div>
                    <div className="flex w-full mt-4">
                        <button
                            className={
                                'w-40 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={handleCloseNewDialog}
                        >
                            <span>{t('common:cancel')}</span>
                        </button>
                        <button
                            className={
                                'w-40 h-12 bg-ve-collab-orange border border-gray-200 text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={() => {
                                createNewGroup();
                                handleCloseNewDialog();
                            }}
                        >
                            <span>{t('common:create')}</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </>
    );
}

function GroupsNoAuthPreview() {
    const { t } = useTranslation(['community', 'common']);
    const exampleGroups = [
        {
            name: t('common:no_auth.group_name1'),
            space_description: t('common:no_auth.group_description1'),
        },
        {
            name: t('common:no_auth.group_name2'),
        },
        {
            _id: '3',
            name: 'Group 3',
            space_description: 'Description of Group 3',
        },
    ];
    return (
        <div className="opacity-40">
            <CustomHead
                pageTitle={t('groups')}
                pageSlug={'groups'}
                pageDescription={t('groups_description')}
            />
            <div className="mt-12">
                <WhiteBox>
                    <VerticalTabs isNoAuthPreview={true}>
                        <div tabid="my_groups" tabname={t('my_groups')}>
                            <div className="min-h-[63vh]">
                                <BoxHeadline title={t('you_are_member_of_groups')} />
                                <div className="divide-y divide-gray-200 my-4">
                                    {exampleGroups.map((group, index) => (
                                        <div key={index} className="px-2 pt-5 pb-3 flex">
                                            <div className="flex-none">
                                                <AuthenticatedImage
                                                    imageId={'team-collab_sm.jpg'}
                                                    alt={t('group_picture')}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                    isNoAuthPreview={true}
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline title={group.name} />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {group.space_description
                                                        ? group.space_description
                                                        : t('no_description_available')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div tabid="find_new_groups" tabname={t('find_new_groups')}></div>
                        <div tabid="all_groups" tabname={t('common:all')}></div>
                        <div
                            tabid="requests_invitations"
                            tabname={t('my_requests_and_invitations')}
                        ></div>
                    </VerticalTabs>
                </WhiteBox>
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-white to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
