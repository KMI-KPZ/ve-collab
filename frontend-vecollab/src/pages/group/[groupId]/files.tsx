import LoadingAnimation from '@/components/common/LoadingAnimation';
import WhiteBox from '@/components/common/WhiteBox';
import CustomHead from '@/components/metaData/CustomHead';
import { AccessDenied } from '@/components/network/AccessDenied';
import FileBrowser from '@/components/network/files/FileBrowser';
import GroupBanner from '@/components/network/GroupBanner';
import GroupHeader from '@/components/network/GroupHeader';
import GroupSidebar from '@/components/network/GroupSidebar';
import { useGetGroup, useGetMyGroupACLEntry, useIsGlobalAdmin } from '@/lib/backend';
import { GetServerSidePropsContext } from 'next';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { type JSX } from 'react';

/**
 * the file share of a group on its own page, so that folders and previews
 * are linkable (?folder=…&preview=…).
 */
GroupFiles.auth = true;
GroupFiles.autoForward = true;
export default function GroupFiles(): JSX.Element {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);
    const router = useRouter();
    const { groupId } = router.query;

    const isGlobalAdmin = useIsGlobalAdmin(session!.accessToken);

    const { data: group, isLoading } = useGetGroup(session!.accessToken, groupId as string);
    const { data: groupACLEntry, isLoading: groupACLEntryLoading } = useGetMyGroupACLEntry(
        session!.accessToken,
        groupId as string
    );

    const username = session?.user?.preferred_username as string;

    // can only be called after group hook is loaded
    const userIsMember = () => group.members.includes(username);
    const userIsAdmin = () => isGlobalAdmin || group.admins.includes(username);

    if (isLoading || !group) return <LoadingAnimation />;

    if (!(userIsMember() || userIsAdmin()))
        return (
            <>
                <CustomHead pageTitle={t('fileshare')} pageSlug={`group/${groupId}/files`} />
                <AccessDenied />
            </>
        );

    return (
        <>
            <CustomHead
                pageTitle={`${group.name} – ${t('fileshare')}`}
                pageSlug={`group/${groupId}/files`}
            />

            <GroupBanner userIsAdmin={userIsAdmin} />
            <div className={'md:mx-20 mb-2 px-5 pt-[100px] relative'}>
                <GroupHeader userIsAdmin={userIsAdmin} />
            </div>
            <div className={'md:mx-20 flex flex-wrap flex-wrap-reverse'}>
                <div className={'w-full md:w-3/4 md:pr-4'}>
                    <WhiteBox>
                        {groupACLEntryLoading ? (
                            <LoadingAnimation />
                        ) : (
                            <FileBrowser
                                groupId={group._id}
                                canRead={userIsAdmin() || !!groupACLEntry?.read_files}
                                canWrite={userIsAdmin() || !!groupACLEntry?.write_files}
                            />
                        )}
                    </WhiteBox>
                </div>
                <GroupSidebar
                    groupId={groupId as string}
                    active="files"
                    description={group?.space_description}
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
