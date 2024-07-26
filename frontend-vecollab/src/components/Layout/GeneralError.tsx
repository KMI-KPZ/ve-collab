import { GiSadCrab } from "react-icons/gi"

export default function GeneralError() {
    return (
        <div className="flex items-center">
            <GiSadCrab size={60} className="m-4" />
            <div className="text-xl text-slate-900">Es ist ein Fehler aufgetreten. Bitte versuche es später nochmal.</div>
        </div>
    )
}