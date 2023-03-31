import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useState } from "react";
import { PlanIdContext } from "../_app";

export default function Name() {

    const {data: session} = useSession()

    const [name, setName] = useState("")

    const {planId, setPlanId} = useContext(PlanIdContext)

    async function handleSubmit(e: FormEvent) {
        const response = await fetchPOST("/planner/insert_empty", {"name": name}, session?.accessToken)
        console.log(name)
        setPlanId(response.inserted_id)
        console.log(response.inserted_id)
    }

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-20"}>
                            Gib deinem Projekt einen Namen
                        </div>
                        <div className="m-7 flex justify-center">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Name eingeben"
                                required={true}
                                className="border border-gray-500 rounded-lg w-3/4 h-12 p-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <button
                                type="button"
                                className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg invisible"
                            >
                                Zurück
                            </button>
                        </div>
                        <div>
                            <Link href={"/planer/2"}>
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