import Image from 'next/image';
import Link from 'next/link';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import { PersonalInformation } from '@/interfaces/profile/profileInterfaces';

interface Props {
    personalInformation: PersonalInformation;
    setPersonalInformation: Dispatch<SetStateAction<PersonalInformation>>;
    updateProfileData(evt: FormEvent): Promise<void>;
    keyCodeDelimiters: number[];
    orcid: string | null | undefined;
    importOrcidProfile(evt: FormEvent): Promise<void>;
}

export default function EditPersonalInformation({
    personalInformation,
    setPersonalInformation,
    updateProfileData,
    keyCodeDelimiters,
    orcid,
    importOrcidProfile,
}: Props) {
    const handleDeleteLanguage = (i: number) => {
        setPersonalInformation({
            ...personalInformation,
            languageTags: personalInformation.languageTags.filter((tag, index) => index !== i),
        });
    };

    const handleAdditionLanguage = (tag: { id: string; text: string }) => {
        setPersonalInformation({
            ...personalInformation,
            languageTags: [...personalInformation.languageTags, tag],
        });
    };

    const handleDragLanguage = (
        tag: { id: string; text: string },
        currPos: number,
        newPos: number
    ) => {
        const newTags = personalInformation.languageTags.slice();

        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);

        // re-render
        setPersonalInformation({
            ...personalInformation,
            languageTags: newTags,
        });
    };

    const handleTagClickLanguage = (index: number) => {
        console.log('The tag at index ' + index + ' was clicked');
    };

    return (
        <form onSubmit={updateProfileData}>
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
                        <button
                            className={'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'}
                        >
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
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Name</div>
                <div className={'flex justify-between'}>
                    {/* TODO validation: treat first name and last name as required information*/}
                    <input
                        className={'border border-gray-500 rounded-lg px-2 py-1'}
                        type="text"
                        placeholder={'Vorname'}
                        value={personalInformation.firstName}
                        onChange={(e) => setPersonalInformation({...personalInformation, firstName: e.target.value})}
                    />
                    <input
                        className={'border border-gray-500 rounded-lg px-2 py-1'}
                        type="text"
                        placeholder={'Nachname'}
                        value={personalInformation.lastName}
                        onChange={(e) => setPersonalInformation({...personalInformation, lastName: e.target.value})}
                    />
                </div>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Institution</div>
                <input
                    className={'border border-gray-500 rounded-lg px-2 py-1 w-1/2'}
                    type="text"
                    placeholder={'Name deiner aktuellen Institution'}
                    value={personalInformation.institution}
                    onChange={(e) => setPersonalInformation({...personalInformation, institution: e.target.value})}
                />
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Bio</div>
                <textarea
                    className={'w-full border border-gray-500 rounded-lg px-2 py-1'}
                    rows={5}
                    placeholder={'Erzähle kurz etwas über dich'}
                    value={personalInformation.bio}
                    onChange={(e) => setPersonalInformation({...personalInformation, bio: e.target.value})}
                ></textarea>
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Fachgebiet</div>
                <input
                    className={'border border-gray-500 rounded-lg px-2 py-1 w-1/2'}
                    type="text"
                    placeholder={'Worin liegt deine Expertise?'}
                    value={personalInformation.expertise}
                    onChange={(e) => setPersonalInformation({...personalInformation, expertise: e.target.value})}
                />
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Geburtstag</div>
                <input
                    className={'border border-gray-500 rounded-lg px-2 py-1'}
                    type="date"
                    value={personalInformation.birthday}
                    onChange={(e) => setPersonalInformation({...personalInformation, birthday: e.target.value})}
                />
            </div>
            <div className={'my-5'}>
                <div className={'mb-1 font-bold text-slate-900 text-lg'}>Sprachen</div>
                <ReactTags
                    tags={personalInformation.languageTags}
                    delimiters={keyCodeDelimiters}
                    handleDelete={handleDeleteLanguage}
                    handleAddition={handleAdditionLanguage}
                    handleDrag={handleDragLanguage}
                    handleTagClick={handleTagClickLanguage}
                    inputFieldPosition="bottom"
                    placeholder="Enter, um neue Sprache hinzuzufügen"
                    classNames={{
                        tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                        tagInputField: 'w-3/4 border border-gray-500 rounded-lg my-4 px-2 py-1',
                        remove: 'ml-1',
                    }}
                />
            </div>
        </form>
    );
}
