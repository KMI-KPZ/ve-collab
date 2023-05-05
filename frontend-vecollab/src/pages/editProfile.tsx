import WhiteBox from '@/components/Layout/WhiteBox';
import LoadingAnimation from '@/components/LoadingAnimation';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { WithContext as ReactTags } from 'react-tag-input';

interface Props {
    firstName: string;
    lastName: string;
    institution: string;
    profilePictureUrl: string;
    bio: string;
    department: string;
    birthday: string;
    expertise: string;
    languages: string[];
    accessToken: string;
}

export default function EditProfile() {
    const [firstName, setFirstName] = useState<string | undefined>();
    const [lastName, setLastName] = useState<string | undefined>();
    const [bio, setBio] = useState('');
    const [expertise, setExpertise] = useState('');
    const [birthday, setBirthday] = useState('');
    const [languageTags, setLanguageTags] = useState([{ id: '', text: '' }]);
    const [veInterests, setVeInterests] = useState(['', '']);
    const [veGoals, setVeGoals] = useState(['']);
    const [experience, setExperience] = useState(['']);
    const [preferredFormats, setPreferredFormats] = useState(['']);

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/profileinformation`, session?.accessToken).then((data) => {
                setLoading(false);
                if (data) {
                    console.log(data);
                    setFirstName(data.profile.first_name);
                    setLastName(data.profile.last_name);
                    setBio(data.profile.bio);
                    setExpertise(data.profile.expertise);
                    setBirthday(data.profile.birthday);
                    setLanguageTags(
                        data.profile.languages.map((language: string) => ({
                            id: language,
                            text: language,
                        }))
                    );
                    setVeInterests(data.profile.ve_interests);
                    setVeGoals(data.profile.ve_goals);
                    setExperience(data.profile.experience);
                    setPreferredFormats(data.profile.preferred_formats);
                }
            });
        } else {
            signIn('keycloak');
        }
    }, [session, status, router]);

    const handleDelete = (i: number) => {
        setLanguageTags(languageTags.filter((tag, index) => index !== i));
    };

    const handleAddition = (tag: { id: string; text: string }) => {
        setLanguageTags([...languageTags, tag]);
    };

    const handleDrag = (tag: { id: string; text: string }, currPos: number, newPos: number) => {
        const newTags = languageTags.slice();

        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);

        // re-render
        setLanguageTags(newTags);
    };

    const handleTagClick = (index: number) => {
        console.log('The tag at index ' + index + ' was clicked');
    };

    const KeyCodes = {
        comma: 188,
        enter: 13,
    };

    const delimiters = [KeyCodes.comma, KeyCodes.enter];

    const modifyVeInterests = (index: number, value: string) => {
        let newInterests = [...veInterests];
        newInterests[index] = value;
        setVeInterests(newInterests);
    };

    const addVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeInterests([...veInterests, '']);
    };

    const removeVeInterestInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veInterests]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeInterests(copy);
    };

    const modifyVeGoals = (index: number, value: string) => {
        let newGoals = [...veGoals];
        newGoals[index] = value;
        setVeGoals(newGoals);
    };

    const addVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        setVeGoals([...veGoals, '']);
    };

    const removeVeGoalsInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...veGoals]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setVeGoals(copy);
    };

    const modifyExperience = (index: number, value: string) => {
        let newExperience = [...experience];
        newExperience[index] = value;
        setExperience(newExperience);
    };

    const addExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        setExperience([...experience, '']);
    };

    const removeExperienceInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...experience]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setExperience(copy);
    };

    const modifyPreferredFormats = (index: number, value: string) => {
        let newFormats = [...preferredFormats];
        newFormats[index] = value;
        setPreferredFormats(newFormats);
    };

    const addPreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        setPreferredFormats([...preferredFormats, '']);
    };

    const removePreferredFormatsInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...preferredFormats]; // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop();
        setPreferredFormats(copy);
    };

    const updateProfileData = async (evt: FormEvent) => {
        evt.preventDefault();

        await fetchPOST(
            '/profileinformation',
            {
                first_name: firstName,
                last_name: lastName,
                bio: bio,
                expertise: expertise,
                birthday: birthday,
                languages: languageTags.map((elem) => elem.text),
                ve_interests: veInterests,
                ve_goals: veGoals,
                experience: experience,
                preferred_formats: preferredFormats,
            },
            session?.accessToken
        );

        // TODO render success ui feedback
    };

    return (
        <div className={'flex justify-center'}>
            <WhiteBox>
                <div className={'w-[60rem]'}>
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <VerticalTabs>
                            <div tabname="Stammdaten">
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-end'}>
                                        <Link href={'/profile'}>
                                            <button
                                                className={
                                                    'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                }
                                            >
                                                Abbrechen
                                            </button>
                                        </Link>
                                        <button
                                            type="submit"
                                            className={
                                                'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                            }
                                        >
                                            Speichern
                                        </button>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Name
                                        </div>
                                        <div className={'flex justify-between'}>
                                            {/* TODO validation: treat first name and last name as required information*/}
                                            <input
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1'
                                                }
                                                type="text"
                                                placeholder={'Vorname'}
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                            />
                                            <input
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1'
                                                }
                                                type="text"
                                                placeholder={'Nachname'}
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Bio
                                        </div>
                                        <textarea
                                            className={
                                                'w-full border border-gray-500 rounded-lg px-2 py-1'
                                            }
                                            rows={5}
                                            placeholder={'Erzähle kurz etwas über dich'}
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                        ></textarea>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Fachgebiet
                                        </div>
                                        <input
                                            className={
                                                'border border-gray-500 rounded-lg px-2 py-1'
                                            }
                                            type="text"
                                            placeholder={'In welcher Abteilung lehrst du?'}
                                            value={expertise}
                                            onChange={(e) => setExpertise(e.target.value)}
                                        />
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Geburtstag
                                        </div>
                                        <input
                                            className={
                                                'border border-gray-500 rounded-lg px-2 py-1'
                                            }
                                            type="date"
                                            value={birthday}
                                            onChange={(e) => setBirthday(e.target.value)}
                                        />
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Sprachen
                                        </div>
                                        <ReactTags
                                            tags={languageTags}
                                            delimiters={delimiters}
                                            handleDelete={handleDelete}
                                            handleAddition={handleAddition}
                                            handleDrag={handleDrag}
                                            handleTagClick={handleTagClick}
                                            inputFieldPosition="bottom"
                                            placeholder="Enter oder Komma, um neue Sprache hinzuzufügen"
                                            classNames={{
                                                tag: 'mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg',
                                                tagInputField:
                                                    'w-2/3 border border-gray-500 rounded-lg my-4 px-2 py-1',
                                                remove: 'ml-1',
                                            }}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div tabname="VE-Info">
                                <form onSubmit={updateProfileData}>
                                    <div className={'flex justify-end'}>
                                        <Link href={'/profile'}>
                                            <button
                                                className={
                                                    'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                                }
                                            >
                                                Abbrechen
                                            </button>
                                        </Link>
                                        <button
                                            type="submit"
                                            className={
                                                'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                            }
                                        >
                                            Speichern
                                        </button>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            VE-Themeninteressen
                                        </div>
                                        {veInterests.map((interest, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'In welchen Themengebieten willst du dich mit VE bewegen?'
                                                }
                                                value={interest}
                                                onChange={(e) =>
                                                    modifyVeInterests(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removeVeInterestInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addVeInterestInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            VE-Zielsetzungen
                                        </div>
                                        {veGoals.map((goal, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'Welche Ziele willst du mit VE erreichen?'
                                                }
                                                value={goal}
                                                onChange={(e) =>
                                                    modifyVeGoals(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removeVeGoalsInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addVeGoalsInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Erfahrungen
                                        </div>
                                        {experience.map((exp, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'Welche Erfahrungen konntest du bereits sammeln?'
                                                }
                                                value={exp}
                                                onChange={(e) =>
                                                    modifyExperience(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removeExperienceInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addExperienceInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={'my-5'}>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            präferierte Formate
                                        </div>
                                        {preferredFormats.map((format, index) => (
                                            <input
                                                key={index}
                                                className={
                                                    'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-full'
                                                }
                                                type="text"
                                                placeholder={
                                                    'In welchen Formaten möchtest du VEs abhalten? z.B. synchron/asynchron/hybrid'
                                                }
                                                value={format}
                                                onChange={(e) =>
                                                    modifyPreferredFormats(index, e.target.value)
                                                }
                                            />
                                        ))}
                                        <div className={'w-full mt-1 flex justify-end'}>
                                            <button onClick={removePreferredFormatsInputField}>
                                                <RxMinus size={20} />
                                            </button>
                                            <button onClick={addPreferredFormatsInputField}>
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div tabname="Lehre & Forschung">ebenfalls Empty</div>
                            <div tabname="CV">ofc Empty</div>
                            <div tabname="VE-Schaufenster">
                                <div className={''}>logo Empty</div>
                            </div>
                        </VerticalTabs>
                    )}
                </div>
            </WhiteBox>
        </div>
    );
}
