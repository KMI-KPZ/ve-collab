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
                                <div className={"mt-11 font-bold text-4xl"}>Max Mustermann</div>
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
                    <div className={"h-96 mx-20 flex"}>
                        <div className={"w-3/4  mr-4"}>
                            <div className={"h-96 p-4 my-8 bg-white rounded-3xl shadow-2xl"}> VE relevante Profilinfos?</div>
                            <div className={"h-96 p-4 my-8 bg-white rounded-3xl shadow-2xl"}>
                                Timeline?
                            </div>
                        </div>
                        <div className={"w-1/4  ml-4"}>
                            <div className={"h-80 p-4 my-8 bg-white rounded-3xl shadow-2xl"}>Stammdaten</div>
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


