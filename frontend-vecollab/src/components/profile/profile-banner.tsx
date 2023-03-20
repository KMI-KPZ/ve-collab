import Image from "next/image"
import blueBackground from "@/images/footer/KAVAQ_Footer_rounded.png"

interface Props {
    followsNum: number,
    followersNum: number
}

export default function ProfileBanner({followsNum, followersNum}: Props) {
    return (
        <>
            <div className={"w-full h-72 mt-10 relative rounded-2xl"}>
                <Image className={"z-10"} fill src={blueBackground} alt={""} />
                <div className={"flex absolute bottom-5 right-14 divide-x z-20"}>
                    <div className={"pr-6 text-lg text-white"}>
                        <div className={"font-bold"}>{followsNum}</div>
                        <div>Folgt</div>
                    </div>
                    <div className={"pl-6 text-lg text-white"}>
                        <div className={"font-bold"}>{followersNum}</div>
                        <div>Follower</div>
                    </div>
                </div>
            </div>
        </>
    )
}