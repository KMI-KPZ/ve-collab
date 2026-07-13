import { FormEvent } from 'react';
import EditProfileHeader from './EditProfileHeader';
import EditProfileHeadline from './EditProfileHeadline';
import EditProfileVerticalSpacer from './EditProfileVerticalSpacer';
import { useTranslation } from 'next-i18next';
import { fetchGET } from '@/lib/backend';
import { useSession } from 'next-auth/react';

interface Props {
    updateProfileData(evt: FormEvent): Promise<void>;
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}
export default function EditProfileDownloadData({
    updateProfileData,
    orcid,
    importOrcidProfile,
}: Props) {
    const { t } = useTranslation(['community', 'common']);
    const { data: session } = useSession();

    const downloadData = async () => {
        fetchGET('/userdata', session?.accessToken)
            .catch((error) => {
                console.error('Error downloading data:', error);
            })
            .then((response) => {
                // create file to download
                const blob = new Blob([JSON.stringify(response.data, undefined, 2)], {
                    type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'userdata.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    };

    return (
        <form onSubmit={updateProfileData}>
            <EditProfileHeader orcid={orcid} importOrcidProfile={importOrcidProfile} />
            <EditProfileVerticalSpacer>
                <EditProfileHeadline name={t('download_data.title')} />
                <div className="mb-2 text-sm">{t('download_data.description')}</div>
                <button
                    className={
                        'bg-ve-collab-orange text-white my-4 py-2 px-5 rounded-lg cursor-pointer'
                    }
                    onClick={(e) => {
                        e.preventDefault();
                        downloadData();
                    }}
                >
                    {t('download_data.download_now')}
                </button>
            </EditProfileVerticalSpacer>
        </form>
    );
}
