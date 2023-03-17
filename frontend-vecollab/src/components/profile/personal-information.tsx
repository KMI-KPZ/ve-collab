interface Props {
    name: string,
    bio: string,
    department: string,
    birthday: string,
    languages: string[]
}

export default function PersonalInformation({ bio, name, department, birthday, languages }: Props) {
    return (
        <div className={"p-4 my-8 bg-white rounded-3xl shadow-2xl"}>
            <div className={"mx-2 divide-y"}>
                <div className={"pb-4"}>
                    <div className={"font-bold text-slate-900 text-xl my-1"}>Bio</div>
                    <div className={"text-sm"}>{bio}</div>
                </div>
                <div className={"py-4"}>
                    <div className={"text-sm text-gray-600 my-1"}>Name</div>
                    <div className={"font-bold text-slate-900"}>{name}</div>
                </div>
                <div className={"py-4"}>
                    <div className={"text-sm text-gray-600 my-1"}>Fachgebiet</div>
                    <div className={"font-bold text-slate-900"}>{department}</div>
                </div>
                <div className={"py-4"}>
                    <div className={"text-sm text-gray-600 my-1"}>Geburtstag</div>
                    <div className={"font-bold text-slate-900"}>{birthday}</div>
                </div>
                <div className={"pt-4 mb-1"}>
                    <div className={"text-sm text-gray-600 my-1"}>Sprachen</div>
                    <div className={"font-bold text-slate-900 flex flex-wrap"}>
                        {languages.map((language) => (
                            <div key={language} className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>{language}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}