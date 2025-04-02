import { FormEvent, useState } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import EditProfileHeadline from './EditProfileHeadline';
import { Trans, useTranslation } from 'next-i18next';
import { signOut, useSession } from 'next-auth/react';
import ButtonPrimary from '../common/buttons/ButtonPrimary';
import ConfirmDialog from '../common/dialogs/Confirm';
import { fetchDELETE } from '@/lib/backend';
import LoadingAnimation from '../common/LoadingAnimation';

interface Props {
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditProfileDelete({ updateProfileData, orcid, importOrcidProfile }: Props) {
    const { t } = useTranslation(['community', 'common']);

    const { data: session } = useSession();
    const [askDeletion, setAskDeletion] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    const deleteProfile = async () => {
        setAskDeletion(false);
        setLoading(true);

        const result = await fetchDELETE('/users/delete', {}, session?.accessToken);

        if (!result.success) {
            console.error('Error', result);
        }
        await signOut({ callbackUrl: '/' });
    };

    const handleAsk = () => {};

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('delete_profile.title')} />
                <div className="rounded-md bg-red-200 border-2 border-red-500 p-2 m-2">
                    <div>
                        <Trans
                            i18nKey="delete_profile.description"
                            ns="community"
                            components={{
                                br: <br />,
                                bold: <strong />,
                                italic: <i />,
                            }}
                        />
                    </div>
                </div>
                <ButtonPrimary onClick={() => setAskDeletion(true)} className="bg-red-800 ml-auto">
                    {t('delete_profile.delete')}
                </ButtonPrimary>
            </EditProfileVerticalSpacer>
            {loading && (
                <div className="fixed inset-0 -top-[30px] w-[99svw] left-1/2 -translate-x-1/2 h-[calc(100svh-85px)] z-50 bg-gray-900/50">
                    <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2">
                        <div className="">
                            <LoadingAnimation />
                        </div>
                    </div>
                </div>
            )}
            {askDeletion && (
                <ConfirmDialog
                    message={t('delete_profile.confirmation')}
                    callback={(proceed) => {
                        if (proceed) deleteProfile();
                        setAskDeletion(false);
                    }}
                />
            )}
        </form>
    );
}
