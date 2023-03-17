import Container from "@/components/Layout/container"
import PersonalInformation from "@/components/profile/personal-information"
import ProfileBanner from "@/components/profile/profile-banner"
import ProfileHeader from "@/components/profile/profile-header"
import Image from "next/image"
import { GetServerSideProps } from "next/types"
import { RxDotsVertical } from "react-icons/rx"
import Tabs from "@/components/profile/Tabs"

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
                            <div className={"h-[30rem] flex p-4 my-8 bg-white rounded-3xl shadow-2xl"}> {/* remove height once content is implemented to avoid unexpected overflow */}
                                <Tabs>
                                    <div tabname="CV">
                                        See ya later, <em>Alligator</em>!
                                    </div>
                                    <div tabname="VE-Interessen">
                                        After 'while, <em>Crocodile</em>!
                                    </div>
                                    <div tabname="Erfahrungen">
                                        Nothing to see here, this tab is <em>extinct</em>!
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
                                <div className={"mx-2 my-1 font-bold text-slate-900 text-xl"}>
                                    meine Highlight VEs
                                </div>
                                <div className={"mx-2 divide-y"}>
                                    <div className={"py-4"}>
                                        <div className={"font-bold text-lg"}>Menschenrechte in der Welt</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                    <div className={"py-4"}>
                                        <div className={"font-bold text-lg"}>Gleichberechtigung</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                    <div className={"py-4"}>
                                        <div className={"font-bold text-lg"}>Demokratieverständnis</div>
                                        <div className={"text-sm text-gray-600 my-1"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                        <div>01.01.2023</div>
                                    </div>
                                    <div className={"py-4"}>
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