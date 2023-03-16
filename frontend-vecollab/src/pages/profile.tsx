import Container from "@/components/Layout/container"
import ProfileBanner from "@/components/profile/profile-banner"
import Image from "next/image"
import { GetServerSideProps } from "next/types"
import { RxDotsVertical } from "react-icons/rx"

interface Props {

}

export default function Profile(props: Props) {
    return (
        <>
            <Container>
                <ProfileBanner />
                <Container>
                    <div className={"h-40 mx-20 relative -mt-16 z-10"}>
                        <div className={"flex"}>
                            <div className={"mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl"}>
                                <Image height={180} width={180} src={"/images/random_user.jpg"} alt={""} />
                            </div>
                            <div className={"mr-auto"}>
                                <button className={"border border-white bg-black/75 text-white rounded-lg px-3 py-1 mt-2"}><span>Profil bearbeiten</span></button>
                                <div className={"mt-11 font-bold text-4xl text-slate-900"}>Max Mustermann</div>
                                <div className={"text-gray-500"}>Universität Leipzig</div>

                            </div>
                            <div className={"flex items-end mb-12"}>
                                <button className={"w-32 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-2 rounded-lg shadow-lg"}> <span>Folgen</span></button>
                                <button className={"w-32 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl"}> <span>Nachricht</span></button>
                                <button className={"h-12 ml-2"}><span><RxDotsVertical size={30} color={""} /></span></button>
                            </div>
                        </div>
                    </div>
                </Container>
                <Container>
                    <div className={"mx-20 flex"}>
                        <div className={"w-3/4  mr-4"}>
                            <div className={"h-[30rem] p-4 my-4 bg-white rounded-3xl shadow-2xl"}>
                                <div> VE relevante Profilinfos?</div>
                                <div>z.b. VE-Interessen, abgeschlossene Projekte</div>
                                <div>ggf. zur besseren Füllung Bio von rechts mit rüber ziehen als erstes</div>
                            </div>
                            <div className={"h-96 p-4 my-8 bg-white rounded-3xl shadow-2xl"}>
                                Timeline?
                            </div>
                        </div>
                        <div className={"w-1/4  ml-4"}>
                            <div className={"p-4 my-4 bg-white rounded-3xl shadow-2xl"}>
                                <div className={"mx-2 divide-y"}>
                                    <div className={"pb-4"}>
                                        <div className={"font-bold text-slate-900 text-xl my-1"}>Bio</div>
                                        <div className={"text-sm"}>Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.</div>
                                    </div>
                                    <div className={"py-4"}>
                                        <div className={"text-sm text-gray-600 my-1"}>Name</div>
                                        <div className={"font-bold text-slate-900"}>Max Mustermann</div>
                                    </div>
                                    <div className={"py-4"}>
                                        <div className={"text-sm text-gray-600 my-1"}>Fachgebiet</div>
                                        <div className={"font-bold text-slate-900"}>Informatik</div>
                                    </div>
                                    <div className={"py-4"}>
                                        <div className={"text-sm text-gray-600 my-1"}>Geburtstag</div>
                                        <div className={"font-bold text-slate-900"}>01.01.1990</div>
                                    </div>
                                    <div className={"pt-4"}>
                                        <div className={"text-sm text-gray-600 my-1"}>Sprachen</div>
                                        <div className={"font-bold text-slate-900 flex flex-wrap"}>
                                            <div className={"mr-2 mb-2 px-1 rounded-lg bg-gray-300 shadow-lg"}>Deutsch</div>
                                            <div className={"mr-2 mb-2 px-1 rounded-lg bg-gray-300 shadow-lg"}>Englisch</div>
                                            <div className={"mr-2 mb-2 px-1 rounded-lg bg-gray-300 shadow-lg"}>Spanisch</div>
                                            <div className={"mr-2 mb-2 px-1 rounded-lg bg-gray-300 shadow-lg"}>Franzözisch</div>
                                            <div className={"mr-2 mb-2 px-1 rounded-lg bg-gray-300 shadow-lg"}>Italienisch</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={"h-80 p-4 my-8 bg-white rounded-3xl shadow-2xl"}>Follower</div>
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

        }
    }
}


