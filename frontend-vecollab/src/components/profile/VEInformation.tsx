import BoxContentHeadline from "./BoxContentHeadline"
import VEInformationContentList from "./VEInformationContentList"

export default function VEInformation(){
    return (
        <div className={"h-full mx-2 my-1 overflow-y-auto content-scrollbar"}>
            <BoxContentHeadline className={"my-1"} text={"VE-Themeninteressen"} />
            <VEInformationContentList items={["aktuelle IT-Trends weltweit", "Verbindung Biologie - Informatik"]}/>
            <BoxContentHeadline className={"mt-6"} text={"VE-Zielsetzungen"} />
            <VEInformationContentList items={["interdiszplinärer Austausch", "neue Erkenntnisse durch unterschiedliche Sichtweisen", "mehr fällt mir spontan nicht ein sorry"]}/>
            <BoxContentHeadline className={"mt-6"} text={"Erfahrungen"} />
            <VEInformationContentList items={["2x VE mit anderen deutschen Unis", "1x VE mit englischer Uni in asnychroner Veranstaltung", "Link zu einem geplanten VE, falls Best Practises auch ausgefüllt worden"]}/>
            <BoxContentHeadline className={"mt-6"} text={"präferierte Formate"} />
            <div className={"mb-4 py-2 font-bold text-slate-900 flex flex-wrap"}>
                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>hybrid</div>
                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>synchron</div>
            </div>
        </div>
    )
}