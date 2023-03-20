import Image from "next/image"
import { RxDotsVertical } from "react-icons/rx"

interface Props {
    name: string,
    institution: string,
    profilePictureUrl: string
}

export default function ProfileHeader({ name, institution, profilePictureUrl }: Props) {
    return (
        <div className={"flex"}>
            <div className={"mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl"}>
                <Image height={180} width={180} src={profilePictureUrl} alt={""} />
            </div>
            <div className={"mr-auto"}>
                <button className={"border border-white bg-black/75 text-white rounded-lg px-3 py-1 mt-2"}><span>Profil bearbeiten</span></button>
                <div className={"mt-11 font-bold text-4xl text-slate-900"}>{name}</div>
                <div className={"text-gray-500"}>{institution}</div>

            </div>
            <div className={"flex items-end mb-12"}>
                <button className={"w-32 h-12 bg-transparent border border-gray-500 py-3 px-6 mr-2 rounded-lg shadow-lg"}> <span>Folgen</span></button>
                <button className={"w-32 h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl"}> <span>Nachricht</span></button>
                <button className={"h-12 ml-2"}><span><RxDotsVertical size={30} color={""} /></span></button>
            </div>
        </div>
    )
}