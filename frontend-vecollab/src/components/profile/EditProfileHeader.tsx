import { FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
    orcid: string | undefined | null;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

// renders the header bar within the edit form,
// holds the buttons for ORCiD import, cancel and save
export default function EditProfileHeader({ orcid, importOrcidProfile }: Props) {
    return (
        <div className={'flex justify-between'}>
            <button
                type="submit"
                disabled={orcid === undefined || orcid === null}
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
