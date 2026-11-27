import WhiteBox from '@/components/common/WhiteBox';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import { AccessDenied } from '@/components/network/AccessDenied';
import GroupBanner from '@/components/network/GroupBanner';
import GroupHeader from '@/components/network/GroupHeader';
import GroupMembers from '@/components/network/GroupMembers';
import GroupPreview from '@/components/network/GroupPreview';
import GroupSidebar from '@/components/network/GroupSidebar';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { fetchPOST, useGetMyGroupACLEntry, useGetGroup, useIsGlobalAdmin } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Timeline from '@/components/network/Timeline';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';

interface Props {
    socket: Socket;
    openOrCreateChatWith: (users: string[]) => void;
}

Group.auth = true;
Group.autoForward = true;
export default function Group({ socket, openOrCreateChatWith }: Props): JSX.Element {
    const { data: session, status } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const router = useRouter();

    const { groupId } = router.query;

    // the section can be preselected via ?tab=members (e.g. from the file share page)
    const [renderPicker, setRenderPicker] = useState<'timeline' | 'members'>(
        router.query.tab === 'members' ? 'members' : 'timeline'
    );
    useEffect(() => {
        if (router.query.tab === 'members') setRenderPicker('members');
    }, [router.query.tab]);

    const [memberSnippets, setMemberSnippets] = useState<UserSnippet[]>([]);
    const [memberSnippetsLoading, setMemberSnippetsLoading] = useState(true);

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken);

    // TODO use conditional fetching with the swr hook to wait for the router to be ready,
    // because sometimes when the router is not yet ready, but the hook fires
    // an additional request with undefined id is made
    const {
        data: group,
        isLoading,
        mutate: mutateGroup,
    } = useGetGroup(session!.accessToken, groupId as string);

    // TODO use conditional fetching with the swr hook to wait for the router to be ready,
    // because sometimes when the router is not yet ready, but the hook fires
    // an additional request with undefined id is made
    const { data: groupACLEntry, mutate: mutateGroupACLEntry } = useGetMyGroupACLEntry(
        session!.accessToken,
        groupId as string
    );

    useEffect(() => {
        if (isLoading || !group) {
            return;
        }
        // the members are only shown to members and admins, not in the preview
        const username = session?.user?.preferred_username as string;
        const canSeeMembers =
            group.members.includes(username) || group.admins.includes(username) || isGlobalAdmin;
        if (!canSeeMembers) {
            return;
        }
        fetchPOST('/profile_snippets', { usernames: group.members }, session?.accessToken).then(
            (data) => {
                setMemberSnippets(
                    (data.user_snippets || []).map((snippet: any) => ({
                        name: snippet.first_name + ' ' + snippet.last_name,
                        profilePicUrl: snippet.profile_pic,
                        institution: snippet.institution,
                        preferredUsername: snippet.username,
                        chosen_achievement: snippet.chosen_achievement,
                    }))
                );
                setMemberSnippetsLoading(false);
            }
        );
    }, [group, isLoading, session, isGlobalAdmin]);

    function members() {
        // the page can open directly on this tab (e.g. coming back from the file
        // share), in which case the snippets are not loaded yet
        if (memberSnippetsLoading) {
            return (
                <WhiteBox>
                    <LoadingAnimation />
                </WhiteBox>
            );
        }

        return (
            <GroupMembers
                group={group}
                memberSnippets={memberSnippets}
                openOrCreateChatWith={openOrCreateChatWith}
            />
        );
    }

    // can only be called after group hook is loaded
    function userIsMember() {
        return group.members.includes(session?.user?.preferred_username as string);
    }

    // can only be called after group hook is loaded
    function userIsAdmin() {
        return isGlobalAdmin || group.admins.includes(session?.user?.preferred_username as string);
    }

    if (isLoading) return <LoadingAnimation />;

    // the backend denies invisible groups to everybody except their members and
    // global admins, so does the page (and for groups that don't exist)
    if (!group || (group.invisible && !(userIsMember() || userIsAdmin())))
        return (
            <>
                <CustomHead pageTitle={t('groups')} pageSlug={`group/${groupId}`} />
                <AccessDenied />
            </>
        );

    // visible groups show their public information to everybody else, who may join
    if (!(userIsMember() || userIsAdmin()))
        return (
            <>
                <CustomHead pageTitle={t('groups')} pageSlug={`group/${groupId}`} />
                <GroupPreview
                    group={group}
                    onMembershipChange={() => Promise.all([mutateGroup(), mutateGroupACLEntry()])}
                />
            </>
        );

    return (
        <>
            <CustomHead pageTitle={t('groups')} pageSlug={`group/${groupId}`} />

            <GroupBanner userIsAdmin={userIsAdmin} />
            <div className={'md:mx-20 mb-2 px-5 pt-[100px] relative'}>
                <GroupHeader userIsAdmin={userIsAdmin} />
            </div>
            <div className={'md:mx-20 flex flex-wrap flex-wrap-reverse'}>
                <div className={'w-full md:w-3/4 md:pr-4'}>
                    {(() => {
                        switch (renderPicker) {
                            case 'timeline':
                                return (
                                    <Timeline
                                        socket={socket}
                                        group={group._id}
                                        userIsAdmin={userIsAdmin()}
                                        groupACL={groupACLEntry}
                                    />
                                );
                            case 'members':
                                return members();

                            default:
                                return <div></div>;
                        }
                    })()}
                </div>
                <GroupSidebar
                    groupId={groupId as string}
                    active={renderPicker}
                    description={group?.space_description}
                    onSelectSection={(section) => {
                        setRenderPicker(section);
                        router.replace(
                            section === 'members'
                                ? `/group/${groupId}?tab=members`
                                : `/group/${groupId}`,
                            undefined,
                            { shallow: true }
                        );
                    }}
                />
            </div>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
