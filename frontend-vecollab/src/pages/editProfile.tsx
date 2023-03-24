import WhiteBox from "@/components/Layout/WhiteBox";
import VerticalTabs from "@/components/profile/VerticalTabs";
import { BACKEND_URL } from "@/constants";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getToken } from "next-auth/jwt";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
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

export default function EditProfile(props: Props) {

    const [firstName, setFirstName] = useState(props.firstName)
    const [lastName, setLastName] = useState(props.lastName)
    const [bio, setBio] = useState(props.bio)
    const [expertise, setExpertise] = useState(props.department)
    const [birthday, setBirthday] = useState(props.birthday)

    const [tags, setTags] = useState(
        props.languages.map(language => ({ id: language, text: language }))
    );

    const handleDelete = (i: number) => {
        setTags(tags.filter((tag, index) => index !== i));
    };

    const handleAddition = (tag: { id: string, text: string }) => {
        setTags([...tags, tag]);
    };

    const handleDrag = (tag: { id: string, text: string }, currPos: number, newPos: number) => {
        const newTags = tags.slice();

        newTags.splice(currPos, 1);
        newTags.splice(newPos, 0, tag);

        // re-render
        setTags(newTags);
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
        console.log("backend updaten")
        console.log({ firstName: firstName, lastName: lastName, bio: bio, expertise: expertise, birthday: birthday, languages: tags.map(elem => elem.text) })
        
        const headers = {
            "Authorization": "Bearer " + props.accessToken,
        }
        
        try {

            const backendUpdate = await fetch(BACKEND_URL + "/profileinformation", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({first_name: firstName, last_name: lastName, bio: bio, expertise: expertise, birthday:birthday, languages: tags.map(elem => elem.text) })
            })
            
            const response = await backendUpdate.json()
            console.log(response)
        }
        catch(e){
            console.log("Fetch Error")
            console.log(e)
        }
    }

    return (
        <div className={"flex justify-center"}>
            <WhiteBox>
                <div className={"w-[60rem]"}>
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
                                    <ReactTags tags={tags}
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
                </div>
            </WhiteBox>
        </div >
    )
}

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {

    const token = await getToken({ req: context.req })
    if (token) {
        const headers = {
            "Authorization": "Bearer " + token.accessToken
        }

        let backendResponse = null;
        let data = null;
        try {
            backendResponse = await fetch(BACKEND_URL + "/profileinformation", {
                headers: headers
            })
            data = await backendResponse.json()
            if (backendResponse.status === 200) {
                return {
                    props: {
                        firstName: data.profile.first_name,
                        lastName: data.profile.last_name,
                        institution: data.profile.institution,
                        profilePictureUrl: "/images/random_user.jpg",
                        bio: data.profile.bio,
                        department: data.profile.expertise,
                        birthday: data.profile.birthday,
                        languages: data.profile.languages,
                        accessToken: token.accessToken,
                    }
                }
            }
        }
        catch (e) {
            console.log("network error, probably backend down")
            return {
                props: {
                    firstName: "Max",
                    lastName: "Mustermann",
                    institution: "Universität Leipzig",
                    profilePictureUrl: "/images/random_user.jpg",
                    bio: "Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.",
                    department: "Informatik",
                    birthday: "01.01.1990",
                    languages: ["Deutsch", "Englisch", "Spanisch", "Französisch", "Italienisch"],
                    accessToken: "",
                }
            }
        }
    }

    return {
        props: {
            firstName: "Max",
            lastName: "Mustermann",
            institution: "Universität Leipzig",
            profilePictureUrl: "/images/random_user.jpg",
            bio: "Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.",
            department: "Informatik",
            birthday: "01.01.1990",
            languages: ["Deutsch", "Englisch", "Spanisch", "Französisch", "Italienisch"],
            accessToken: "",
        }
    }
}