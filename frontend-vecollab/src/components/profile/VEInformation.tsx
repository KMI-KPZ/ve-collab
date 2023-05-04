import BoxContentHeadline from "./BoxContentHeadline"
import VEInformationContentList from "./VEInformationContentList"

interface Props {
    veInterests: string[],
    veGoals: string[],
    experiences: string[],
    preferredFormats: string[]
}


export default function VEInformation({veInterests, veGoals, experiences, preferredFormats}: Props){
    return (
        <div className={"h-full mx-2 my-1 overflow-y-auto content-scrollbar"}>
            <BoxContentHeadline className={"my-1"} text={"VE-Themeninteressen"} />
            <VEInformationContentList items={veInterests}/>
            <BoxContentHeadline className={"mt-6"} text={"VE-Zielsetzungen"} />
            <VEInformationContentList items={veGoals}/>
            <BoxContentHeadline className={"mt-6"} text={"Erfahrungen"} />
            <VEInformationContentList items={experiences}/>
            <BoxContentHeadline className={"mt-6"} text={"präferierte Formate"} />
            <div className={"mb-4 py-2 font-bold text-slate-900 flex flex-wrap"}>
                {preferredFormats.map(format => (
                    <div key={format} className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>{format}</div>
                ))}
            </div>
        </div>
    )
}