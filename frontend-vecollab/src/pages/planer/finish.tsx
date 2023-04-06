import WhiteBox from "@/components/Layout/WhiteBox";
import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useContext, useEffect, useState } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";
import { PlanIdContext } from "../_app";


export default function Finished() {

    const handleSubmit = async (e: FormEvent) => {
        
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
                            Fertig
                        </div>
                        <div className={"text-center mb-20"}>herzlichen Glückwunsch, du hast den VE erfolgreich geplant!</div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/16"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/overview"}>
                                <button
                                    type="submit"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={handleSubmit}
                                >
                                    Weiter zur Übersicht
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