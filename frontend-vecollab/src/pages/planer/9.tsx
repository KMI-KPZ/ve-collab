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
                            Welche Ziele sollen die einzelnen Zielgruppen erreichen?
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        <div className="mx-7 mt-7 flex justify-center">
                            <label htmlFor="name" className="px-10 py-2">
                                für Zielgruppe ...
                            </label>
                            <textarea
                                rows={5}
                                /*onChange={handleChange}*/
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg w-3/4 p-2"
                            />
                        </div>
                        <div className="mx-7 mt-7 flex justify-center">
                            <label htmlFor="name" className="px-10 py-2">
                                für Zielgruppe ...
                            </label>
                            <textarea
                                rows={5}
                                /*onChange={handleChange}*/
                                placeholder="Name eingeben"
                                className="border border-gray-500 rounded-lg w-3/4 p-2"
                            />
                        </div>
                        <div className={"w-3/4 mx-7 mt-1 flex justify-end"}>
                            <button><RxPlus size={50}/></button> {/* todo state + useeffect to create more input fields*/}
                        </div>
                    </div>
                    <div className="flex justify-around w-full">
                        <div>
                            <Link href={"/planer/1"}>
                                <button
                                    type="button"
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Zurück
                                </button>
                            </Link>
                        </div>
                        <div>
                            <Link href={"/planer/3"}>
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