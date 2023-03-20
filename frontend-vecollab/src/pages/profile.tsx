import Container from "@/components/Layout/container"
import PersonalInformation from "@/components/profile/personal-information"
import ProfileBanner from "@/components/profile/profile-banner"
import ProfileHeader from "@/components/profile/profile-header"
import Image from "next/image"
import { GetServerSideProps } from "next/types"
import { RxDotFilled } from "react-icons/rx"
import Tabs from "@/components/profile/Tabs"
import { AriaAttributes, DOMAttributes } from "react"

interface Props {
    name: string,
    institution: string,
    profilePictureUrl: string,
    bio: string,
    department: string,
    birthday: string,
    languages: string[]
}

// have to declare "tabname" as a valid attribute for div tags, otherwise typescript is bothered
declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // extends React's HTMLAttributes
        tabname?: string;
    }
}

export default function Profile(props: Props) {
    return (
        <>
            <Container>
                <ProfileBanner followsNum={2500} followersNum={3500} />
                <div className="container mx-auto mb-2 px-5">
                    <div className={"mx-20 relative -mt-16 z-10"}>
                        <ProfileHeader name={props.name} institution={props.institution} profilePictureUrl={props.profilePictureUrl}></ProfileHeader>
                    </div>
                </div>
                <Container>
                    <div className={"mx-20 flex"}>
                        <div className={"w-3/4  mr-4"}>
                            <div className={"flex p-4 pb-6 my-8 bg-white rounded-3xl shadow-2xl"}>
                                <Tabs>
                                    <div tabname="CV">
                                        <div className={"h-[30rem] mx-2 my-1 flex"}> {/* fixed height to enable scrolling instead of letting to box grow very large */}
                                            <div className={"w-1/2 overflow-y-auto content-scrollbar"}>
                                                <div className={"font-bold text-slate-900 text-2xl text-center"}>Ausbildung</div>
                                                <div className={"divide-y mr-4"}>
                                                    <div className={"py-3"}>
                                                        <div className={"font-bold"}>Universität Leipzig</div>
                                                        <div className={"flex items-center"}>
                                                            <div>Master of Science</div>
                                                            <RxDotFilled />
                                                            <div>Informatik</div>
                                                        </div>
                                                        <div className={"text-sm text-gray-600"}>2020-2022</div>
                                                        <div className={"mt-1"}>Zusatzinfos...</div>
                                                    </div>
                                                    <div className={"py-3"}>
                                                        <div className={"font-bold"}>Universität Leipzig</div>
                                                        <div className={"flex items-center"}>
                                                            <div>Bachelor of Science</div>
                                                            <RxDotFilled />
                                                            <div>Informatik</div>
                                                        </div>
                                                        <div className={"text-sm text-gray-600"}>2016-2020</div>
                                                        <div className={"mt-1"}>Zusatzinfos...</div>
                                                    </div>
                                                    <div className={"py-3"}>
                                                        <div className={"font-bold"}>Gymnasium</div>
                                                        <div className={"flex items-center"}>
                                                            <div>Abitur</div>
                                                        </div>
                                                        <div className={"text-sm text-gray-600"}>2009-2016</div>
                                                        <div className={"mt-1"}>Zusatzinfos...</div>
                                                    </div>
                                                    <div className={"py-3"}>
                                                        <div className={"font-bold"}>Grundschule</div>
                                                        <div className={"flex items-center"}>
                                                            <div>gymnasiale Bildungsempfehlung</div>
                                                        </div>
                                                        <div className={"text-sm text-gray-600"}>2005-2009</div>
                                                        <div className={"mt-1"}>Zusatzinfos...</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={"w-1/2 overflow-y-auto content-scrollbar"}>
                                                <div className={"font-bold text-slate-900 text-2xl text-center"}>Berufserfahrung</div>
                                                <div className={"divide-y ml-4"}>
                                                    <div className={"py-3"}>
                                                        <div className={"font-bold"}>wissenschaftlicher Mitarbeiter</div>
                                                        <div className={"flex items-center"}>
                                                            <div>Institut für angewandte Informatik (InfAI) e.V.</div>
                                                        </div>
                                                        <div className={"flex items-center text-sm text-gray-600"}>
                                                            <div>10/2022 - heute</div>
                                                            <RxDotFilled />
                                                            <div>6 Monate</div>
                                                        </div>
                                                        <div className={"text-sm text-gray-600"}>Leipzig</div>
                                                        <div className={"mt-1"}>Projekt VE-Collab</div>
                                                    </div>
                                                    <div className={"py-3"}>
                                                        <div className={"font-bold"}>wissenschaftliche Hilfskraft</div>
                                                        <div className={"flex items-center"}>
                                                            <div>Universität Leipzig</div>
                                                            <RxDotFilled />
                                                            <div>Rechenzentrum (URZ)</div>
                                                        </div>
                                                        <div className={"flex items-center text-sm text-gray-600"}>
                                                            <div>05/2018 - 10/2022</div>
                                                            <RxDotFilled />
                                                            <div>4 Jahre, 6 Monate</div>
                                                        </div>
                                                        <div className={"text-sm text-gray-600"}>Leipzig</div>
                                                        <div className={"mt-1"}>Entwicklertätigkeiten in diversen Projekten, z.B. SB:Digital, SO-SERVE</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div tabname="Lehre & Forschung">
                                        <div className={"h-[30rem] mx-2 my-1 overflow-y-auto content-scrollbar"}>
                                            <div className={"my-1 font-bold text-slate-900 text-2xl"}>Forschungsschwerpunkte</div>
                                            <div className={"mb-4 py-2 font-bold text-slate-900 flex flex-wrap"}>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>DNA-Sequenzanalyse</div>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>High Performance Computing</div>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>Parallel Computing</div>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>bioinspirierte Verfahren</div>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>Machine Learning</div>
                                            </div>
                                            <div className={"mt-8 font-bold text-slate-900 text-2xl"}>Lehrveranstaltungen</div>
                                            <div className={"divide-y"}>
                                                <div className={"py-2 mr-2"}>
                                                    <div className={"font-semibold"}>Aktuelle Trends der Informatik</div>
                                                    <div>Master Informatik, Master Data Science</div>
                                                    <div className={"text-gray-600"}>WiSe 22/23</div>
                                                </div>
                                                <div className={"py-2 mr-2"}>
                                                    <div className={"font-semibold"}>Eingebettete Systeme</div>
                                                    <div>Master Informatik, Master Data Science</div>
                                                    <div className={"text-gray-600"}>WiSe 22/23</div>
                                                </div>
                                                <div className={"py-2 mr-2"}>
                                                    <div className={"font-semibold"}>Modellierung biologischer und molekularer Systeme</div>
                                                    <div>Master Informatik, Master Data Science</div>
                                                    <div className={"text-gray-600"}>WiSe 22/23</div>
                                                </div>
                                                <div className={"py-2 mr-2"}>
                                                    <div className={"font-semibold"}>noch ein sehr sehr langer Titel für eine Lehrveranstaltung, der im ungünstigesten Falls sogar mehr als eine Zeile einnimmt</div>
                                                    <div>Master Informatik, Master Data Science</div>
                                                    <div className={"text-gray-600"}>WiSe 22/23</div>
                                                </div>
                                                <div className={"py-2 mr-2"}>
                                                    <div className={"font-semibold"}>Modellierung biologischer und molekularer Systeme</div>
                                                    <div>Master Informatik, Master Data Science, Master Bioinformatik, und noch viele weitere Studiengänge, die man hier auch gar nicht all aufzählen kann</div>
                                                    <div className={"text-gray-600"}>WiSe 22/23</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div tabname="VE-Infos">
                                        <div className={"h-[30rem] mx-2 my-1 overflow-y-auto content-scrollbar"}>
                                            <div className={"my-1 font-bold text-slate-900 text-2xl"}>VE-Themeninteressen</div>
                                            <ul className={"py-2 mr-2 list-disc list-inside"}>
                                                <li>aktuelle IT-Trends weltweit</li>
                                                <li>Verbindung Biologie - Informatik</li>
                                            </ul>
                                            <div className={"mt-6 font-bold text-slate-900 text-2xl"}>VE-Zielsetzungen</div>
                                            <ul className={"py-2 mr-2 list-disc list-inside"}>
                                                <li>interdiszplinärer Austausch</li>
                                                <li>neue Erkenntnisse durch unterschiedliche Sichtweisen</li>
                                                <li>mehr fällt mir spontan nicht ein sorry</li>
                                            </ul>
                                            <div className={"mt-6 font-bold text-slate-900 text-2xl"}>Erfahrungen</div>
                                            <ul className={"py-2 mr-2 list-disc list-inside"}>
                                                <li>2x VE mit anderen deutschen Unis</li>
                                                <li>1x VE mit englischer Uni in asnychroner Veranstaltung</li>
                                            </ul>
                                            <div className={"mt-6 font-bold text-slate-900 text-2xl"}>präferierte Formate</div>
                                            <div className={"mb-4 py-2 font-bold text-slate-900 flex flex-wrap"}>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>hybrid</div>
                                                <div className={"mr-2 mb-2 px-2 rounded-lg bg-gray-300 shadow-lg"}>synchron</div>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs>
                            </div>
                            <div className={"h-96 p-4 my-8 bg-white rounded-3xl shadow-2xl"}> {/* remove height once content is implemented to avoid unexpected overflow */}
                                Timeline?
                            </div>
                        </div>
                        <div className={"w-1/4  ml-4"}>
                            <PersonalInformation name={props.name} bio={props.bio} department={props.department} birthday={props.birthday} languages={props.languages}></PersonalInformation>
                            <div className={"p-4 my-8 bg-white rounded-3xl shadow-2xl"}>
                                <div className={"mx-2 px-1 my-1 font-bold text-slate-900 text-xl"}>
                                    meine Highlight VEs
                                </div>
                                <div className={"mx-2 my-1 "}>
                                    <div className={"py-4 px-1 my-1 border border-white rounded-xl hover:border hover:border-ve-collab-orange"}>
                                        <div className={"font-bold text-lg"}>Menschenrechte in der Welt</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                    <div className={"py-4 px-1 my-1 border border-white hover:rounded-xl hover:border hover:border-ve-collab-orange"}>
                                        <div className={"font-bold text-lg"}>Gleichberechtigung</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                    <div className={"py-4 px-1 my-1 border border-white rounded-xl hover:border hover:border-ve-collab-orange"}>
                                        <div className={"font-bold text-lg"}>Demokratieverständnis</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                    <div className={"py-4 px-1 my-1 border border-white rounded-xl hover:border hover:border-ve-collab-orange"}>
                                        <div className={"font-bold text-lg"}>noch ein langer Titel der über 2 Zeilen geht</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </Container>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        props: {
            name: "Max Mustermann",
            institution: "Universität Leipzig",
            profilePictureUrl: "/images/random_user.jpg",
            bio: "Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.",
            department: "Informatik",
            birthday: "01.01.1990",
            languages: ["Deutsch", "Englisch", "Spanisch", "Französisch", "Italienisch"]
        }
    }
}