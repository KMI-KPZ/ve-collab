import { VEWindowItem } from '@/interfaces/profile/profileInterfaces';
import BoxHeadline from '@/components/common/BoxHeadline';
import VEVitrineItem from './VEVitrineItem';
import { useTranslation } from 'next-i18next';
import H2 from '../common/H2';
import Link from 'next/link';
import { MdEdit } from 'react-icons/md';
import NoItemAvailable from './NoItemAvailable';

interface Props {
    items: VEWindowItem[];
    isOwnProfile: boolean;
}

export default function VEVitrine({ items, isOwnProfile }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <div className="mt-4 border-t pt-4 group">
            <div className="flex">
                <H2 className="flex">{t('ve_window')}</H2>
                {isOwnProfile && (
                    <Link
                        href={'/profile/edit#tabVEWindow'}
                        className="ml-auto invisible group-hover:visible italic text-slate-600 text-xs"
                    >
                        <MdEdit className="inline" /> {t('common:edit')}
                    </Link>
                )}
            </div>
            {items.length > 0 ? (
                <ul className={'mx-2'}>
                    {items.map((item, index) => (
                        <VEVitrineItem
                            key={index}
                            title={item.title === '' ? item.plan.name : item.title}
                            excerpt={item.description}
                            // date={item.}
                            _id={item.plan._id}
                        />
                    ))}
                </ul>
            ) : (
                <NoItemAvailable />
            )}
        </div>
    );
}
