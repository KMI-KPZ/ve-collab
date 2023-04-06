import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useEffect, useState } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";
import { PlanIdContext } from "../_app";
import { useRouter } from "next/router";

interface Goal {
    target_group: string,
    goal: string
}

export default function Goals() {

    const [goals, setGoals] = useState<Goal[]>([{ target_group: "", goal: "" }])

    const [allSameGoal, setAllSameGoal] = useState(false)

    const { planId, setPlanId } = useContext(PlanIdContext)
    const { data: session } = useSession()

    //console.log(planId)

    const goalsAlreadyHaveTargetGroup = (goals: Goal[], tgName: string) => {
        for (const obj of goals){
            if(obj.target_group === tgName){
                return true
            }
        }
        return false
    }

    const router = useRouter()
    useEffect(() => {
        if (!planId) {
            router.push("/planer/overview")
        }
        fetchGET(`/planner/get?_id=${planId}`, session?.accessToken)
            .then((data) => {
                console.log(data)

                if (data.plan) {
                    if (Object.keys(data.plan.goals).length > 0) {
                        let list: Goal[] = []
                        for (const [key, value] of Object.entries(data.plan.goals)) {
                            let value_copy = String(value)
                            list.push({ target_group: key, goal: value_copy })
                        }
                        data.plan.audience.forEach((tg: any) => {
                            if(!goalsAlreadyHaveTargetGroup(list, tg.name)){
                                list.push({ target_group: tg.name, goal: "" })
                            }
                        });
                        setGoals(list)
                    }
                    else if (data.plan.audience.length > 0) {
                        console.log("lol")
                        let list: Goal[] = []
                        data.plan.audience.forEach((tg: any) => {
                            list.push({ target_group: tg.name, goal: "" })
                        });
                        setGoals(list)
                    }
                    else {
                        setGoals([{ target_group: "", goal: "" }])
                    }
                }
                else {
                    setGoals([{ target_group: "", goal: "" }])
                }
            })
    }, [planId, session?.accessToken, router])

    const handleSubmit = async (e: FormEvent) => {
        let payload: Record<string, string> = {}
        goals.forEach(goal => {
            payload[goal.target_group] = goal.goal
        });
        const response = await fetchPOST("/planner/update_field", { plan_id: planId, field_name: "goals", value: payload }, session?.accessToken)
        console.log(response)
        console.log(goals)
    }

    const modifyGoal = (index: number, value: string) => {
        let newGoals = [...goals]
        if (allSameGoal) {
            newGoals.forEach(element => {
                element.goal = value
            });
        }
        else {
            newGoals[index].goal = value
        }
        setGoals(newGoals)
    }
    const modifyAllSameGoal = (sameGoal: boolean) => {
        setAllSameGoal(sameGoal)
    }

    const addInputField = (e: FormEvent) => {
        e.preventDefault()
        setGoals([...goals, { target_group: "", goal: "" }])
    }

    const removeInputField = (e: FormEvent) => {
        e.preventDefault()
        let copy = [...goals] // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop()
        setGoals(copy)
    }

    console.log(goals)
    console.log(allSameGoal)

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            Welche Ziele sollen die einzelnen Zielgruppen erreichen?
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        <div className="mt-4 flex justify-center">
                            <label htmlFor="name" className="px-2 py-2">
                                alle Zielgruppen haben die gleichen Ziele?
                            </label>
                            <input
                                type={"checkbox"}
                                checked={allSameGoal}
                                onChange={e => modifyAllSameGoal(!allSameGoal)}
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg p-2"
                            />
                        </div>
                        {allSameGoal && (
                            <div className="mt-4 flex justify-center">
                                <div className="w-3/4">
                                    <div className="px-2 py-2">
                                        für alle Zielgruppen
                                    </div>
                                    <textarea
                                        rows={5}
                                        onChange={e => modifyGoal(0, e.target.value)}
                                        placeholder="Ziele beschreiben"
                                        className="border border-gray-500 rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                        )}
                        {!allSameGoal && (
                            <>
                                {goals.map((goalEntry, index) => (
                                    <div key={index} className="mt-4 flex justify-center">
                                        <div className="w-3/4">
                                            <div className="px-2 py-2">
                                                für Zielgruppe: {goalEntry.target_group}
                                            </div>
                                            <textarea
                                                rows={5}
                                                value={goalEntry.goal}
                                                onChange={e => modifyGoal(index, e.target.value)}
                                                placeholder="Ziele beschreiben"
                                                className="border border-gray-500 rounded-lg w-full p-2"
                                            />
                                        </div>
                                    </div>
                                ))}
                                <div className={"mx-2 flex justify-end mr-36 mt-4"}>
                                    <button onClick={removeInputField}><RxMinus size={20} /></button>
                                    <button onClick={addInputField}><RxPlus size={20} /></button>
                                </div>
                            </>
                        )}

                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/8"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/10"}>
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