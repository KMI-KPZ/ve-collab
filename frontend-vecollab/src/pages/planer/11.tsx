import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useEffect, useState } from "react";
import { PlanIdContext } from "../_app";

export default function Realization() {

    const [realization, setRealization] = useState("")

    const { planId, setPlanId } = useContext(PlanIdContext)
    const { data: session } = useSession()

    //console.log(planId)

    useEffect(() => {
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken)
            .then((data) => {
                console.log(data)
                if (data.plan) {
                    if (data.plan.realization) {
                        setRealization(data.plan.realization)
                    }
                }
                else {
                    setRealization("")
                }
            })
    }, [planId, session?.accessToken])

    const handleSubmit = async (e: FormEvent) => {
        const response = await fetchPOST("/planner/update_field", { plan_id: planId, field_name: "realization", value: realization }, session?.accessToken)
        console.log(response)
        console.log(realization)
    }

    console.log(realization)

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            Wie wird der VE umgesetzt?
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        <div className="mx-7 mt-7 flex justify-center">
                            <select
                                value={realization}
                                onChange={e => setRealization(e.target.value)}
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                            >
                                <option value="">keine Auswahl</option>
                                <option value="asynchron">asynchron</option>
                                <option value="synchron">synchron</option>
                                <option value="gemischt">gemischt</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/10"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/12"}>
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