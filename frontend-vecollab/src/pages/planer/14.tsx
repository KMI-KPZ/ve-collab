import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import Link from "next/link";
import { FormEvent } from "react";
import { RxPlus } from "react-icons/rx";

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
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            Werden Sie neue Inhalte für den VE erstellen und bestehende Teile der Lehrveranstaltungen anpassen?
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        <div className="mx-7 mt-7 flex justify-center">
                            <label htmlFor="radio" className="px-10 py-2">
                                Ja
                            </label>
                            <input
                                type="radio"
                                name="radio"
                                value={"true"}
                                /*onChange={handleChange}*/
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg h-12 p-2"
                            />
                            <label htmlFor="radio" className="px-10 py-2">
                                Nein
                            </label>
                            <input
                                type="radio"
                                name="radio"
                                value={"false"}
                                /*onChange={handleChange}*/
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg h-12 p-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/13"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/15"}>
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