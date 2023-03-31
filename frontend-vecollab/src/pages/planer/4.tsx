import WhiteBox from "@/components/Layout/WhiteBox";
import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useEffect, useState } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";
import { PlanIdContext } from "../_app";

interface Lecture {
    name: string,
    lecture_type: string,
    lecture_format: string,
    participants_amount?: number
}

export default function Lectures() {

    const [lectures, setLectures] = useState<Lecture[]>([{ name: "", lecture_type: "", lecture_format: "", participants_amount: undefined }, { name: "", lecture_type: "", lecture_format: "", participants_amount: undefined }])

    const { planId, setPlanId } = useContext(PlanIdContext)
    const { data: session } = useSession()

    //console.log(planId)

    useEffect(() => {
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken)
            .then((data) => {
                console.log(data)

                if (data.plan) {
                    if(data.plan.lectures.length > 0){
                        setLectures(data.plan.lectures)
                    }
                    else {
                        setLectures([{ name: "", lecture_type: "", lecture_format: "", participants_amount: undefined }])
                    }
                }
                else {
                    setLectures([{ name: "", lecture_type: "", lecture_format: "", participants_amount: undefined }])
                }
            })
    }, [planId, session?.accessToken])


    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST("/planner/update_field", { plan_id: planId, field_name: "lectures", value: lectures }, session?.accessToken)
        console.log(response)
        console.log(lectures)
    }

    const modifyName = (index: number, value: string) => {
        let newLectures = [...lectures]
        newLectures[index].name = value
        setLectures(newLectures)
    }
    const modifyLectureType = (index: number, value: string) => {
        let newLectures = [...lectures]
        newLectures[index].lecture_type = value
        setLectures(newLectures)
    }
    const modifyLectureFormat = (index: number, value: string) => {
        let newLectures = [...lectures]
        newLectures[index].lecture_format = value
        setLectures(newLectures)
    }
    const modifyParticipantsAmount = (index: number, value: number) => {
        let newLectures = [...lectures]
        newLectures[index].participants_amount = value
        setLectures(newLectures)
    }    

    const addInstitutionBox = (e: FormEvent) => {
        e.preventDefault()
        setLectures([...lectures, { name: "", lecture_type: "", lecture_format: "", participants_amount: undefined }])
    }

    const removeInstitutionBox = (e: FormEvent) => {
        e.preventDefault()
        let copy = [...lectures] // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop()
        setLectures(copy)
    }

    console.log(lectures)

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            Beschreibe die teilnehmenden Lehrveranstaltungen
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        <div className="flex flex-wrap justify-center">
                            {lectures.map((lecture, index) => (
                                <div key={index} className={"mx-2"}>
                                    <WhiteBox>
                                        <div className="mt-4 flex">
                                            <div className="w-1/4 flex items-center">
                                                <label htmlFor="name" className="px-2 py-2">
                                                    Name
                                                </label>
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={lecture.name}
                                                    onChange={e => modifyName(index, e.target.value)}
                                                    placeholder="Name eingeben"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/4 flex items-center">
                                                <label htmlFor="type" className="px-2 py-2">
                                                    Typ
                                                </label>
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    name="type"
                                                    value={lecture.lecture_type}
                                                    onChange={e => modifyLectureType(index, e.target.value)}
                                                    placeholder="z.B. Wahl, Wahlpflicht, Pflicht"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/4 flex items-center">
                                                <label htmlFor="format" className="px-2 py-2">
                                                    Format
                                                </label>
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    name="format"
                                                    value={lecture.lecture_format}
                                                    onChange={e => modifyLectureFormat(index, e.target.value)}
                                                    placeholder="z.B. online, hybrid, präsenz"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex">
                                            <div className="w-1/2 flex items-center">
                                                <label htmlFor="participants" className="px-2 py-2">
                                                    Teilnehmendenanzahl
                                                </label>
                                            </div>
                                            <div className="w-1/2">
                                                <input
                                                    type="number"
                                                    name="participants"
                                                    value={lecture.participants_amount}
                                                    onChange={e => modifyParticipantsAmount(index, Number(e.target.value))}
                                                    placeholder="Anzahl eingeben"
                                                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                                                />
                                            </div>
                                        </div>
                                    </WhiteBox>
                                </div>
                            ))}
                        </div>
                        <div className={"mx-2 flex justify-end"}>
                            <button onClick={removeInstitutionBox}><RxMinus size={20} /></button> {/* todo state + useeffect to create more input fields*/}
                            <button onClick={addInstitutionBox}><RxPlus size={20} /></button> {/* todo state + useeffect to create more input fields*/}
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/3"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/5"}>
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={handleSubmit}
                                >
                                    Weiter
                                </button>
                            </Link>
                        </div>
                    </div>
                </form>
                <SideProgressBarSection />
            </div>
        </>
    );
}