import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useEffect, useState } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";
import { PlanIdContext } from "../_app";

export default function Languages() {

    const [languages, setLanguages] = useState([""])

    const { planId, setPlanId } = useContext(PlanIdContext)
    const { data: session } = useSession()

    //console.log(planId)

    useEffect(() => {
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken)
            .then((data) => {
                console.log(data)

                if (data.plan) {
                    if (data.plan.languages.length > 0) {
                        setLanguages(data.plan.languages)
                    }
                    else {
                        setLanguages([""])
                    }
                }
                else {
                    setLanguages([""])
                }
            })
    }, [planId, session?.accessToken])

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST("/planner/update_field", { plan_id: planId, field_name: "languages", value: languages }, session?.accessToken)
        console.log(response)
        console.log(languages)
    }

    const modifyLanguage = (index: number, value: string) => {
        let newLanguages = [...languages]
        newLanguages[index] = value
        setLanguages(newLanguages)
    }

    const addInputField = (e: FormEvent) => {
        e.preventDefault()
        setLanguages([...languages, ""])
    }

    const removeInputField = (e: FormEvent) => {
        e.preventDefault()
        let copy = [...languages] // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop()
        setLanguages(copy)
    }

    console.log(languages)

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            In welchen Sprachen findet der VE statt?
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        {languages.map((language, index) => (
                            <div key={index} className="mx-7 mt-7 flex justify-center">
                                <input
                                    type="text"
                                    value={language}
                                    onChange={e => modifyLanguage(index, e.target.value)}
                                    placeholder="Sprache eingeben"
                                    className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                                />
                            </div>
                        ))}
                        <div className={"w-3/4 mx-7 mt-3 flex justify-end"}>
                            <button onClick={removeInputField}><RxMinus size={20} /></button>
                            <button onClick={addInputField}><RxPlus size={20} /></button>
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/6"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/8"}>
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