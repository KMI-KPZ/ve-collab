import WhiteBox from "@/components/Layout/WhiteBox";
import LoadingAnimation from "@/components/LoadingAnimation";
import VerticalTabs from "@/components/profile/VerticalTabs";
import { BACKEND_URL } from "@/constants";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getToken } from "next-auth/jwt";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import { WithContext as ReactTags } from 'react-tag-input';

interface Props {
    firstName: string,
    lastName: string,
    institution: string,
    profilePictureUrl: string,
    bio: string,
    department: string,
    birthday: string,
    expertise: string,
    languages: string[],
    accessToken: string,
}

export default function EditProfile() {

    const [firstName, setFirstName] = useState<string|undefined>()
    const [lastName, setLastName] = useState<string|undefined>()
    const [bio, setBio] = useState("")
    const [expertise, setExpertise] = useState("")
    const [birthday, setBirthday] = useState("")
    const [languageTags, setLanguageTags] = useState(
        [{ id: "", text: "" }]
    );

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false)
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== "loading") {
            if (!session || session?.error === "RefreshAccessTokenError") {
                console.log("forced new signIn")
                signIn("keycloak");
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === "loading") {
            setLoading(true)
            return
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/profileinformation`, session?.accessToken).then(
                (data) => {
                    setLoading(false)
                    if (data) {
                        console.log(data)
                        setFirstName(data.profile.first_name)
                        setLastName(data.profile.last_name)
                        setBio(data.profile.bio)
                        setExpertise(data.profile.expertise)
                        setBirthday(data.profile.birthday)
                        setLanguageTags(data.profile.languages.map((language: string) => ({ id: language, text: language })))
                    }
                }
            );
        }
        else {
            signIn("keycloak");
        }
    }, [session, status, router]);

    const handleDelete = (i: number) => {
        setLanguageTags(languageTags.filter((tag, index) => index !== i));
    };

    const handleAddition = (tag: { id: string, text: string }) => {
        setLanguageTags([...languageTags, tag]);
    };

    const handleDrag = (tag: { id: string, text: string }, currPos: number, newPos: number) => {
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
        enter: 13
    };

    const delimiters = [KeyCodes.comma, KeyCodes.enter];

    const updateProfileData = async (evt: FormEvent) => {
        evt.preventDefault()

        await fetchPOST(
            "/profileinformation",
            { first_name: firstName, last_name: lastName, bio: bio, expertise: expertise, birthday: birthday, languages: languageTags.map(elem => elem.text) },
            session?.accessToken
        );
        
        // TODO render success ui feedback
    }

    return (
        <div className={"flex justify-center"}>
            <WhiteBox>
                <div className={"w-[60rem]"}>
                    {loading ? (
                        <LoadingAnimation />
                    ) : (
                        <VerticalTabs>
                            <div tabname="Stammdaten">
                                <form onSubmit={updateProfileData}>
                                    <div className={"flex justify-end"}>
                                        <Link href={"/profile"}>
                                            <button className={"mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg"}>Abbrechen</button>
                                        </Link>
                                        <button type="submit" className={"bg-ve-collab-orange text-white py-2 px-5 rounded-lg"}>Speichern</button>
                                    </div>
                                    <div className={"my-5"}>
                                        <div className={"mb-1 font-bold text-slate-900 text-lg"}>Name</div>
                                        <div className={"flex justify-between"}>
                                            {/* TODO validation: treat first name and last name as required information*/}
                                            <input className={"border border-gray-500 rounded-lg px-2 py-1"} type="text" placeholder={"Vorname"} value={firstName} onChange={e => setFirstName(e.target.value)} />
                                            <input className={"border border-gray-500 rounded-lg px-2 py-1"} type="text" placeholder={"Nachname"} value={lastName} onChange={e => setLastName(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className={"my-5"}>
                                        <div className={"mb-1 font-bold text-slate-900 text-lg"}>Bio</div>
                                        <textarea className={"w-full border border-gray-500 rounded-lg px-2 py-1"} rows={5} placeholder={"Erzähle kurz etwas über dich"} value={bio} onChange={e => setBio(e.target.value)}></textarea>
                                    </div>
                                    <div className={"my-5"}>
                                        <div className={"mb-1 font-bold text-slate-900 text-lg"}>Fachgebiet</div>
                                        <input className={"border border-gray-500 rounded-lg px-2 py-1"} type="text" placeholder={"In welcher Abteilung lehrst du?"} value={expertise} onChange={e => setExpertise(e.target.value)} />
                                    </div>
                                    <div className={"my-5"}>
                                        <div className={"mb-1 font-bold text-slate-900 text-lg"}>Geburtstag</div>
                                        <input className={"border border-gray-500 rounded-lg px-2 py-1"} type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                                    </div>
                                    <div className={"my-5"}>

                                        <div className={"mb-1 font-bold text-slate-900 text-lg"}>Sprachen</div>
                                        <ReactTags tags={languageTags}
                                            delimiters={delimiters}
                                            handleDelete={handleDelete}
                                            handleAddition={handleAddition}
                                            handleDrag={handleDrag}
                                            handleTagClick={handleTagClick}
                                            inputFieldPosition="bottom"
                                            placeholder="Enter oder Komma, um neue Sprache hinzuzufügen"
                                            classNames={{
                                                tag: "mr-2 mb-2 px-2 py-1 rounded-lg bg-gray-300 shadow-lg",
                                                tagInputField: "w-2/3 border border-gray-500 rounded-lg my-4 px-2 py-1",
                                                remove: "ml-1"
                                            }} />
                                    </div>
                                </form>
                            </div>
                            <div tabname="VE-Info">
                                auch Empty
                            </div>
                            <div tabname="Lehre & Forschung">
                                ebenfalls Empty
                            </div>
                            <div tabname="CV">
                                ofc Empty
                            </div>
                            <div tabname="VE-Schaufenster">
                                <div className={""}>
                                    logo Empty
                                </div>
                            </div>
                        </VerticalTabs>
                    )}
                </div>
            </WhiteBox>
        </div >
    )
}