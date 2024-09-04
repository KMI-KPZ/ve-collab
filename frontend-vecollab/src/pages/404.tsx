import Link from "next/link";
import { GiSadCrab } from "react-icons/gi";

export default function Custom404() {

    return (
        <div className="bg-slate-100">
            <div className="flex flex-col m-auto p-12 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                <div className="flex items-start w-1/2">
                    <GiSadCrab size={60} className="-rotate-12" />
                    <div className="flex flex-col items-start ml-6">
                        <div className="text-xl text-slate-900">Diese Seite konnte leider nicht gefunden werden.</div>
                        <Link href="/" className="inline-block px-6 py-2 my-4 bg-ve-collab-orange rounded-lg text-white">Zurück zur Startseite</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}