import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import Link from "next/link";
import { FormEvent } from "react";

export default function One() {

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
    }

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    name="generalInformation"
                    method="POST"
                    onSubmit={handleSubmit}
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-20"}>
                            Gib deinem Projekt einen Namen
                        </div>
                        <div className="m-7 flex justify-center">
                            <input
                                type="text"
                                name="projectName"
                                /*onChange={handleChange}*/
                                id="projectName"
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