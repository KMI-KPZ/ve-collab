import BoxHeadline from "./BoxHeadline"
import PersonalInformationItem from "./PersonalInformationItem"
import TagBox from "./TagBox"

interface Props {
    name: string,
    bio: string,
    department: string,
    birthday: string,
    languages: string[]
}

export default function PersonalInformation({ bio, name, department, birthday, languages }: Props) {
    return (
        <>
            <BoxHeadline title={"Bio"} />
            <ul className={"mx-2 px-1 divide-y"}>
                <li className={"pb-4"}>
                    <div className={"text-sm my-1"}>{bio}</div>
                </li>
                <PersonalInformationItem attributeName={"Name"} attributeValue={name}/>
                <PersonalInformationItem attributeName={"Fachgebiet"} attributeValue={department}/>
                <PersonalInformationItem attributeName={"Geburtstag"} attributeValue={birthday}/>
                <li className={"py-4"}>
                    <div className={"text-sm text-gray-600 my-1"}>Sprachen</div>
                    <div className={"font-bold text-slate-900 flex flex-wrap"}>
                        {languages.map((language) => (
                            <TagBox text={language} />
                        ))}
                    </div>
                </li>
            </ul>
        </>
    )
}