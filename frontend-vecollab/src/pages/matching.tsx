import LoadingAnimation from '@/components/common/LoadingAnimation';
import { useGetMatching, useGetSearchResults } from '@/lib/backend';
import { GetStaticPropsContext } from 'next';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';
import CustomHead from '@/components/metaData/CustomHead';
import UserProfileImage from '@/components/network/UserProfileImage';
import { BackendProfile } from '@/interfaces/api/apiInterfaces';
import printUsername from '@/components/common/Username';
import Link from 'next/link';
import ButtonLight from '@/components/common/buttons/ButtongLight';
import { IoIosSend } from 'react-icons/io';
import ButtonPrimary from '@/components/common/buttons/ButtonPrimary';
import { GiStarsStack } from 'react-icons/gi';
import VEInvitationDialog from '@/components/profile/VEInvitationDialog';

interface Props {
    isNoAuthPreview?: boolean;
    openOrCreateChatWith: (users: string[]) => void;
}

Matching.auth = true;
Matching.autoForward = true;
export default function Matching({ isNoAuthPreview = false, openOrCreateChatWith }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [loading, setLoading] = useState<boolean>(true);
    const [result, setResult] = useState<BackendProfile[]>([]);
    const [showMatchingOnly, setShowMatchingOnly] = useState<boolean>(false);
    const [triggerMatching, setTriggerMatching] = useState<boolean>(false);
    const [invitationDialog, setInvitationDialog] = useState<{
        isOpen: boolean;
        username?: BackendProfile;
    }>({
        isOpen: false,
    });

    const { data: searchedUsers, isLoading: loadingSearchUsers } = useGetSearchResults('', [
        'users',
    ]);
    // const { data: allUsers, isLoading: loadingAllUsers } = useGetUsers(session!.accessToken);

    const {
        data: matchedUserSnippets,
        isLoading: isLoadingMatching,
        error,
        mutate,
    } = useGetMatching(triggerMatching, session!.accessToken);

    useEffect(() => {
        if (loading === false) return;
        let newResult = null;

        if (showMatchingOnly === true) {
            if (!matchedUserSnippets.length) {
                setTriggerMatching(true);
            } else {
                newResult = matchedUserSnippets.map((user) => user as unknown as BackendProfile);
            }
        } else {
            if (searchedUsers.users?.length) {
                newResult = searchedUsers.users
                    .map((user) => user)
                    .filter((user) => user.username !== session!.user.preferred_username);
            }
        }
        if (newResult !== null) {
            console.log({ newResult });

            setResult(newResult);
            setLoading(false);
        }
    }, [session, searchedUsers, matchedUserSnippets, showMatchingOnly, loading]);

    const handleClickShowMatchingOnly = () => {
        setLoading(true);
        setShowMatchingOnly(!showMatchingOnly);
    };

    const handleOpenInvitationDialog = (username: BackendProfile) => {
        if (isNoAuthPreview) return;

        setInvitationDialog({
            isOpen: true,
            username,
        });
    };
    const handleCloseInvitationDialog = () => {
        if (isNoAuthPreview) return;

        setInvitationDialog({
            isOpen: false,
        });
    };

    return (
        <div className="m-auto p-6 sm:p-12">
            <CustomHead
                pageTitle={t('matching')}
                pageSlug={'matching'}
                pageDescription={t('matching_description')}
            />

            <div className="flex flex-wrap justify-between items-center mb-10 mt-12">
                <div>
                    <div className={'font-bold text-4xl mb-2'}>{t('matching')}</div>
                    {/* <div className={'text-gray-500 text-xl'}>{t('matching_instructions')}</div> */}
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-y-2">
                <div
                    className={`flex p-2 rounded-full shadow border ${
                        isNoAuthPreview ? '' : 'cursor-pointer'
                    }`}
                    onClick={handleClickShowMatchingOnly}
                >
                    <div className="relative w-[48px] flex items-center ">
                        <div
                            className={`absolute w-[48px] h-[16px] left-0 rounded-md ${
                                showMatchingOnly ? 'bg-green-800' : 'bg-gray-500'
                            }`}
                        ></div>
                        <div
                            className={`absolute  bg-white rounded-full p-1 border ${
                                showMatchingOnly
                                    ? 'right-0 text-ve-collab-blue border-ve-collab-blue'
                                    : 'left-0 text-slate-500 border-slate-500'
                            }`}
                        >
                            <GiStarsStack
                                color=""
                                className={showMatchingOnly ? 'text-orange-300' : 'text-gray-400'}
                            />
                        </div>
                    </div>
                    <span className={`mx-2 ${showMatchingOnly ? '' : 'text-gray-600'}   `}>
                        {t('matching_show_matching_only')}
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="m-12">
                    <LoadingAnimation size="small" /> {t('loading_users')}
                </div>
            ) : (
                <div className="mb-12 rounded-lg shadow bg-white overflow-scroll md:overflow-auto w-full text-left border-1 border-gray-800">
                    <div>
                        {result.length === 0 ? (
                            <>{t('no_user_found')}</>
                        ) : (
                            result.map((user, i) => (
                                <div
                                    key={i}
                                    className={`group/item flex flex-row min-h-[72px] p-1 space-x-3 items-center border-b border-bg-gray-600 ${
                                        isNoAuthPreview ? '' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="grow md:basis-5/12 font-normal text-base group hover:cursor-pointer truncate flex flex-nowrap items-center">
                                        {user.ve_ready ? (
                                            <span
                                                title={t('ve_ready_true')}
                                                className="w-3 h-3 m-2 rounded-full bg-green-500 drop-shadow-[0_0_3px_rgba(34,197,94,1)]"
                                            ></span>
                                        ) : (
                                            <span
                                                title={t('ve_ready_false')}
                                                className="w-3 h-3 m-2 rounded-full bg-red-600 drop-shadow-[0_0_3px_rgba(239,68,68,1)]"
                                            ></span>
                                        )}

                                        <div className="m-2">
                                            <UserProfileImage
                                                profile_pic={user.profile_pic}
                                                chosen_achievement={user.chosen_achievement}
                                            />
                                        </div>
                                        <Link
                                            href={`/profile/user/${user.username}`}
                                            className="py-2 w-full"
                                        >
                                            {printUsername(user)}
                                        </Link>
                                    </div>

                                    <div className="flex gap-x-2 opacity-0 group-hover/item:opacity-100 transition-opacity pr-4">
                                        <ButtonLight
                                            className="!rounded-full"
                                            title={t('send_chat_message_to_user')}
                                            onClick={() => {
                                                openOrCreateChatWith([
                                                    session?.user.preferred_username!,
                                                    user.username,
                                                ]);
                                            }}
                                        >
                                            <IoIosSend />
                                        </ButtonLight>
                                        {user.ve_ready && (
                                            <ButtonPrimary
                                                onClick={() => {
                                                    handleOpenInvitationDialog(user);
                                                }}
                                            >
                                                {t('ve_invitation')}
                                            </ButtonPrimary>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {!isNoAuthPreview && (
                <VEInvitationDialog
                    userid={invitationDialog.username?.username || ''}
                    username={
                        invitationDialog.username?.first_name +
                        ' ' +
                        invitationDialog.username?.last_name
                    }
                    isOpen={invitationDialog.isOpen}
                    callbackDone={handleCloseInvitationDialog}
                />
            )}
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
