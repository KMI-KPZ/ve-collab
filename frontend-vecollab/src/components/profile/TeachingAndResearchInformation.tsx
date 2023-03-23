import BoxContentHeadline from "./BoxContentHeadline";
import TagBox from "./TagBox";
import TeachingInformationContentItem from "./TeachingInformationContentItem";

export default function TeachingAndResearchInformation() {

    let researchInterests = ["DNA-Sequenzanalyse", "High Performance Computing", "Parallel Computing", "bioinspirierte Verfahren", "Machine Learning"]

    return (
        <div className={"h-full mx-2 my-1 overflow-y-auto content-scrollbar"}>
            <BoxContentHeadline className={"my-1"} text={"Forschungsschwerpunkte"} />
            <div className={"mb-4 py-2 font-bold text-slate-900 flex flex-wrap"}>
                {researchInterests.map(text => (
                    <TagBox key={text} text={text} />
                ))}
            </div>
            <BoxContentHeadline className={"mt-6"} text={"Lehrveranstaltungen"} />
            <ul className={"divide-y"}>
                <TeachingInformationContentItem courseTitle={"Aktuelle Trends der Informatik"} participatingAcademicCourses={["Master Informatik", "Master Data Science"]} term={"WiSe 22/23"} />
                <TeachingInformationContentItem courseTitle={"Eingebettete Systeme"} participatingAcademicCourses={["Master Informatik", "Master Data Science"]} term={"WiSe 22/23"} />
                <TeachingInformationContentItem courseTitle={"Modellierung biologischer und molekularer Systeme"} participatingAcademicCourses={["Master Informatik", "Master Data Science"]} term={"WiSe 22/23"} />
                <TeachingInformationContentItem courseTitle={"noch ein sehr sehr langer Titel für eine Lehrveranstaltung, der im ungünstigesten Falls sogar mehr als eine Zeile einnimmt"} participatingAcademicCourses={["Master Informatik", "Master Data Science", "Master Bioinformatik", "und noch viele weitere Studiengänge, die man hier auch gar nicht all aufzählen kann"]} term={"WiSe 22/23"} />
            </ul>
        </div>
    )
}