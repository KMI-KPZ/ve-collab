import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";

interface Goal {
    target_group: string,
    goal: string
}

export default function Goals() {

    const [goals, setGoals] = useState<Goal[]>([{ target_group: "", goal: "" }, { target_group: "", goal: "" }])

    const [allSameGoal, setAllSameGoal] = useState(false)

    const modifytargetGroup = (index: number, value: string) => {
        let newGoals = [...goals]
        newGoals[index].target_group = value
        setGoals(newGoals)
    }
    const modifyGoal = (index: number, value: string) => {
        let newGoals = [...goals]
        newGoals[index].goal = value
        setGoals(newGoals)
    }
    const modifyAllSameGoal = (sameGoal: boolean) => {
        // if it gets set to true, set state to only contain one entry 
        // other posibility is, dont modify goals state here, but change onChange of this case to modify all goals of all target groups
        if (sameGoal === true) {
            setGoals([{target_group: "all", goal: ""}])
        }
        else {
            setGoals([{ target_group: "", goal: "" }, { target_group: "", goal: "" }])
        }
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

    const handleSubmit = (e: FormEvent) => {
        console.log(goals)
        console.log(allSameGoal)
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
                                            <input
                                                type="text"
                                                value={goalEntry.target_group}
                                                onChange={e => modifytargetGroup(index, e.target.value)}
                                                placeholder="Name der Zielgruppe eingeben (gleicher Name wie bei Beschreibung)"
                                                className="border border-gray-500 rounded-lg w-full h-12 p-2 mb-2"
                                            />
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