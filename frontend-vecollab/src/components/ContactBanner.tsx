import { MdMail } from "react-icons/md";

const ContactBanner = (): JSX.Element => (
    <div className='-rotate-90 fixed z-40 -right-16 bottom-20 w-44 h-14 text-xl text-center nowrap rounded-lg bg-ve-collab-blue text-white border border-2 border-slate-50 shadow-white/25'>
        <a className='flex justify-center items-center w-full h-full' href="mailto:schlecht@infai.org,mihaela.markovic@uni-leipzig.de" title='Kontakt per Mail'>
            Kontakt
            <MdMail className='inline m-2' size={20} />
        </a>
    </div>
);

export default ContactBanner