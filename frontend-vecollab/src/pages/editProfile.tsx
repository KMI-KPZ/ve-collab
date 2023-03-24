import WhiteBox from "@/components/Layout/WhiteBox";
import VerticalTabs from "@/components/profile/VerticalTabs";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { WithContext as ReactTags } from 'react-tag-input';

export default function EditProfile() {

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [bio, setBio] = useState("")
    const [expertise, setExpertise] = useState("")
    const [birthday, setBirthday] = useState("")

    // hardcoded examples for now
    const [tags, setTags] = useState([
        { id: 'Deutsch', text: 'Deutsch' },
        { id: 'Englisch', text: 'Englisch' },
        { id: 'Spanisch', text: 'Spanisch' },
        { id: 'Französisch', text: 'Französisch' },
        { id: 'italienisch', text: 'italienisch' }
    ]);

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

    const updateProfileData = (evt: FormEvent) => {
        evt.preventDefault()
        console.log("backend updaten")
        console.log({ firstName: firstName, lastName: lastName, bio: bio, expertise: expertise, birthday: birthday, languages: tags.map(elem => elem.text) })
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