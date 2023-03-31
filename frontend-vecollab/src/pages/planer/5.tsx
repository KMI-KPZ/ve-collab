import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useEffect, useState } from "react";
import { PlanIdContext } from "../_app";

export default function Topic() {

    const [topic, setTopic] = useState("")

    const { planId, setPlanId } = useContext(PlanIdContext)
    const { data: session } = useSession()

    //console.log(planId)

    useEffect(() => {
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken)
            .then((data) => {
                console.log(data)

                if (data.plan.topic) {
                    setTopic(data.plan.topic)

                }
                else {
                    setTopic("")
                }
            })
    }, [planId, session?.accessToken])


    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST("/planner/update_field", { plan_id: planId, field_name: "topic", value: topic }, session?.accessToken)
        console.log(response)
        console.log(topic)
    }

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            zu welchem Thema soll der VE statfinden?
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        <div className="m-7 flex justify-center">
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="Thema eingeben"
                                className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/4"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/6"}>
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