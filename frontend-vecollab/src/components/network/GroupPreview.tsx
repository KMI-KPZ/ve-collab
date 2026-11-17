import { BackendGroup } from '@/interfaces/api/apiInterfaces';
import { fetchPOST } from '@/lib/backend';
import LocalStorage from '@/lib/storage';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState } from 'react';
import AuthenticatedImage from '../common/AuthenticatedImage';
import ButtonDarkBlue from '../common/buttons/ButtonDarkBlue';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import ButtonSecondary from '../common/buttons/ButtonSecondary';

type MembershipAction = 'join' | 'accept_invite' | 'decline_invite' | 'revoke_request';

interface Props {
    // a visible group that the user is no member of
    group: BackendGroup;
    // reloads the group after the user joined, requested to join, ...
    onMembershipChange: () => Promise<unknown>;
}

/**
 * the public information of a group (name, picture and description) along with the
 * possibility to join it, request to join it or to answer an invitation to it
 */
export default function GroupPreview({ group, onMembershipChange }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [sending, setSending] = useState<boolean>(false);
    const [failed, setFailed] = useState<boolean>(false);

    const username = session?.user.preferred_username as string;
    const isInvited = group.invites.includes(username);
    const hasRequested = group.requests.includes(username);

    // joins the group or sends a request to join it, depending on the group
    const send = async (action: MembershipAction) => {
        setSending(true);
        setFailed(false);
        const response = await fetchPOST(
            `/spaceadministration/${action}?id=${group._id}`,
            {},
            session?.accessToken
        );
        if (response.success) {
            // the group may not be suggested anymore
            LocalStorage.removeItem('suggested_groups');
            await onMembershipChange();
        } else {
            setFailed(true);
        }
        setSending(false);
    };

    const actions = () => {
        if (isInvited) {
            return (
                <>
                    <p className="mb-4">{t('group_preview_invited')}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        <ButtonPrimary onClick={() => send('accept_invite')} disabled={sending}>
                            {t('common:accept')}
                        </ButtonPrimary>
                        <ButtonSecondary onClick={() => send('decline_invite')} disabled={sending}>
                            {t('common:decline')}
                        </ButtonSecondary>
                    </div>
                </>
            );
        }
        if (group.joinable) {
            return (
                <>
                    <p className="mb-4">{t('group_preview_join_hint')}</p>
                    <ButtonDarkBlue onClick={() => send('join')} disabled={sending}>
                        {t('join')}
                    </ButtonDarkBlue>
                </>
            );
        }
        if (hasRequested) {
            return (
                <>
                    <p className="mb-4">{t('group_preview_requested')}</p>
                    <ButtonLightBlue onClick={() => send('revoke_request')} disabled={sending}>
                        {t('revoke_request')}
                    </ButtonLightBlue>
                </>
            );
        }
        return (
            <>
                <p className="mb-4">{t('group_preview_request_hint')}</p>
                <ButtonDarkBlue onClick={() => send('join')} disabled={sending}>
                    {t('request_join')}
                </ButtonDarkBlue>
            </>
        );
    };

    return (
        <div className="flex justify-center items-center pt-20 pb-20 px-4">
            <div className="flex flex-col w-full md:w-1/2 items-center rounded-lg shadow-md bg-white p-10 text-center">
                <AuthenticatedImage
                    imageId={group.space_pic}
                    alt={t('group_picture')}
                    width={120}
                    height={120}
                    className="rounded-full"
                />
                <h1 className="font-bold text-3xl pt-5 pb-3 break-words">{group.name}</h1>
                {group.space_description && (
                    <p className="pb-6 text-gray-500 break-words">{group.space_description}</p>
                )}
                {actions()}
                {failed && <p className="mt-4 text-red-700">{t('group_action_error')}</p>}
                <Link href="/groups" className="mt-8 text-ve-collab-blue hover:underline">
                    {t('back_to_groups_overview')}
                </Link>
            </div>
        </div>
    );
}
