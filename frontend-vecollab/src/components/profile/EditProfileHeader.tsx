import { FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createHash } from 'crypto';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

interface Props {
    orcid: string | undefined | null;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

// renders the header bar within the edit form,
// holds the buttons for ORCiD import, cancel and save
export default function EditProfileHeader({ orcid, importOrcidProfile }: Props) {
    const { data: session } = useSession();
    const router = useRouter();
    const { t } = useTranslation(['community', 'common']);

    // trigger a client initiated account linking flow with orcid as per
    // https://www.keycloak.org/docs/latest/server_development/#client-initiated-account-linking
    const triggerOrcidAccountLink = async (evt: FormEvent) => {
        evt.preventDefault();

        const provider = 'orcid';
        const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
        const redirectUri = encodeURIComponent(
            window.location.origin + '/orcidAccountLinkCallback?logout=true&fwd=/profile/edit'
        );
        const nonce = crypto.randomUUID();

        // create a bas64-urlencoded sha256 hash of nonce + session_state + client id + provider
        const toHash = nonce + session?.sessionState + clientId + provider;
        const base64Hash = createHash('sha256').update(toHash).digest().toString('base64');
        const b64HashUrlEncoded = base64Hash
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        // send user to link keycloak account with ORCiD
        let url = `${process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL}realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/broker/${provider}/link?client_id=${clientId}&redirect_uri=${redirectUri}&nonce=${nonce}&hash=${b64HashUrlEncoded}`;
        router.push(url);
    };

    return (
        <div className={'flex justify-between'}>
            {orcid === undefined || orcid === null ? (
                <button
                    type="submit"
                    className={
                        'flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg disabled:cursor-not-allowed disabled:opacity-40'
                    }
                    onClick={(e) => triggerOrcidAccountLink(e)}
                >
                    <Image
                        className="mr-2"
                        src={'/images/orcid_icon.png'}
                        width={24}
                        height={24}
                        alt={''}
                    ></Image>
                    {t("link_orcid_account")}
                </button>
            ) : (
                <button
                    type="submit"
                    className={
                        'flex items-center bg-ve-collab-orange text-white py-2 px-5 rounded-lg disabled:cursor-not-allowed disabled:opacity-40'
                    }
                    onClick={(e) => importOrcidProfile(e)}
                >
                    <Image
                        className="mr-2"
                        src={'/images/orcid_icon.png'}
                        width={24}
                        height={24}
                        alt={''}
                    ></Image>
                    {t("import_orcid_profile")}
                </button>
            )}

            <div className="flex justify-end">
                <Link href={'/profile'}>
                    <button className={'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'}>
                        {t("common:cancel")}
                    </button>
                </Link>
                <button
                    type="submit"
                    className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                >
                    {t("common:save")}
                </button>
            </div>
        </div>
    );
}
