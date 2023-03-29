import HeadProgressBarSection from "@/components/StartingWizard/HeadProgressBarSection";
import SideProgressBarSection from "@/components/StartingWizard/SideProgressBarSection";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";

export default function Partners() {

    const [partners, setPartners] = useState(["test", ""])

    const modifyPartner = (index: number, value: string) => {
        console.log(value)
        console.log(index)
        let newPartners = [...partners]
        newPartners[index] = value
        setPartners(newPartners)
    }

    const addInputField = (e: FormEvent) => {
        e.preventDefault()
        setPartners([...partners, ""])
    }

    const removeInputField = (e: FormEvent) => {
        e.preventDefault()
        let copy = [...partners] // have to create a deep copy that changes reference, because re-render is triggered by reference, not by values in the array
        copy.pop()
        setPartners(copy)
    }

    const handleSubmit = (e: FormEvent) => {
        console.log(partners)
    }

    console.log(partners)

    return (
        <>
            <HeadProgressBarSection />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                <form
                    className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                >
                    <div>
                        <div className={"text-center font-bold text-4xl mb-2"}>
                            Füge deine Partner hinzu
                        </div>
                        <div className={"text-center mb-20"}>optional</div>
                        {partners.map((partner, index) => (
                            <div key={index} className="mx-7 mt-7 flex justify-center">
                                <input
                                    type="text"
                                    value={partner}
                                    onChange={e => modifyPartner(index, e.target.value)}
                                    placeholder="Name eingeben"
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