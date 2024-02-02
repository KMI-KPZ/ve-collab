import Link from "next/link";

export default function ExcludedFromMatchingBanner() {
    return (
        <div className="w-full h-12 flex justify-center items-center bg-red-500 text-white">
            <p>
                aktuell vom Matching ausgeschlossen,{' '}
                <Link className="underline" href={'/editProfile'}>
                    hier
                </Link>{' '}
                ändern!
            </p>
        </div>
    );
}
