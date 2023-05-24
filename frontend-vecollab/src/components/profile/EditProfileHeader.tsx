import { FormEvent, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createHash } from 'crypto';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { signOut } from 'next-auth/react';

interface Props {
    orcid: string | undefined | null;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

// renders the header bar within the edit form,
// holds the buttons for ORCiD import, cancel and save
export default function EditProfileHeader({ orcid, importOrcidProfile }: Props) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!router.isReady || status === 'loading') {
            console.log('waiting');
            return;
        }
        if (router.query.logout === 'true') {
            console.log('trying logout');
            signOut({ callbackUrl: '/waiting?login=true' });
        } else if (router.query.login === 'true') {
            console.log('try login');
            signIn('keycloak', undefined, {
                kc_idp_hint: 'orcid',
                prompt: 'login',
                redirect_uri: 'http://localhost:3000/editProfile',
            });
        }
    }, [session, status, router]);

    const triggerOrcidAccountLink = async (evt: FormEvent) => {
        evt.preventDefault();
        console.log('löol');

        let provider = 'orcid';
        let realm = 'kavaq';
        let clientId = 'test';
        let redirectUri = 'http://localhost:3000/editProfile?logout=true'; // todo other page that tells the user that he gets relogged automatically, if no he has to click link
        let nonce = 'kekwlol';

        let toHash = nonce + session?.sessionState + clientId + provider;
        let hash = createHash('sha256').update(toHash).digest();
        let b64Encoded = hash.toString('base64');
        b64Encoded = b64Encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        console.log(b64Encoded);

        let url = `https://skm.sc.uni-leipzig.de/auth/realms/${realm}/broker/${provider}/link?client_id=${clientId}&redirect_uri=${redirectUri}&nonce=${nonce}&hash=${b64Encoded}`;
        console.log(url);
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
                    ORCiD Account verbinden
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
                    von ORCiD importieren
                </button>
            )}

            <div className="flex justify-end">
                <Link href={'/profile'}>
                    <button className={'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'}>
                        Abbrechen
                    </button>
                </Link>
                <button
                    type="submit"
                    className={'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'}
                >
                    Speichern
                </button>
            </div>
        </div>
    );
}
