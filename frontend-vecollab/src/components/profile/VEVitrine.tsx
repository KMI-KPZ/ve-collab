import { VEWindowItem } from '@/interfaces/profile/profileInterfaces';
import BoxHeadline from '@/components/common/BoxHeadline';
import VEVitrineItem from './VEVitrineItem';
import { useTranslation } from 'next-i18next';

interface Props {
    items: VEWindowItem[];
}

export default function VEVitrine({ items }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <>
            <BoxHeadline title={t("ve_window")} />
            <ul className={'mx-2 my-1 '}>
                {items.map((item, index) => (
                    <VEVitrineItem
                        key={index}
                        title={item.title === '' ? item.plan.name : item.title}
                        excerpt={item.description}
                        _id={item.plan._id}
                    />
                ))}
            </ul>
        </>
    );
}
