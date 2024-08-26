import Link from "next/link";
import { MdMail } from "react-icons/md";

const FeedbackBanner = (): JSX.Element => (
    <>{typeof process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL && (
        <div className='fixed z-40 -right-56 bottom-20 w-72 h-48 -mr-[6px] text-center rounded-lg bg-ve-collab-blue text-white border border-2 border-slate-50 shadow-white/25 flex flex-row divide-x transition ease-in-out delay-150 hover:-translate-x-56 hover:cursor-pointer'>
            <div className='flex justify-center items-center flex-none w-14 text-xl nowrap'>
                <span className="-rotate-90 text-nowrap inline-block">
                    Feedback <MdMail className='inline m-2' size={20} />
                </span>
            </div>
            <div className="m-2 items-center flex flex-col justify-center">
                <p>Hinterlassen Sie uns gerne Ihre Meinung!</p>
                <Link
                    className="p-2 m-2 inline-block rounded-lg text-white text-nowrap bg-ve-collab-orange hover:shadow-button-primary"
                    href={process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL!}
                    target="_blank"
                >
                    Zur Umfrage
                </Link>
                <p className="m-2">
                    Oder kontaktieren Sie uns
                    <Link
                        className="underline decoration-dotted hover:decoration-solid"
                        href="mailto:schlecht@infai.org,mihaela.markovic@uni-leipzig.de"
                        target="_blank"
                    >
                        per Mail
                    </Link>
                </p>
            </div>
        </div>
    )}</>
);

export default FeedbackBanner