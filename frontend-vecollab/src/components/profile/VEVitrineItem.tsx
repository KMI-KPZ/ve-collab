import Link from 'next/link';
import { HiDocument } from 'react-icons/hi';
import { IoMdDocument } from 'react-icons/io';
import { MdDocumentScanner } from 'react-icons/md';
import { TbFileText } from 'react-icons/tb';

interface Props {
    title: string;
    excerpt: string;
    _id: string;
    date?: string;
}

export default function VEVitrineItem({ title, excerpt, _id, date }: Props) {
    return (
        <Link href={`/ve-designer/name?plannerId=${_id}`}>
            <li className={'py-2 px-4 group/ve-item'}>
                <div className={'font-bold text-lg flex items-center'}>
                    <TbFileText className="mr-2" />{' '}
                    <span className="group-hover/ve-item:text-ve-collab-orange">{title}</span>
                </div>
                <div className={'text-sm text-gray-600 my-1 ml-6 line-clamp-2'}>
                    Eine kurze Beschreibungdlf dsfop askdpodkg dspofksa dpsodkg sdpofksd gpo kds
                    dpsodk psodks dfpo sdkdapoFKDBOKVFOTNRF WOI CVCOG JTPFOIWAJ POIJ ...{excerpt}
                </div>
                {date !== undefined && <div>{date}</div>}
            </li>
        </Link>
    );
}
