import { VEWindowItem } from '@/interfaces/profile/profileInterfaces';
import BoxHeadline from './BoxHeadline';
import VEVitrineItem from './VEVitrineItem';

interface Props {
    items: VEWindowItem[];
}

export default function VEVitrine({ items }: Props) {
    let excerpt =
        'Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.';

    return (
        <>
            <BoxHeadline title={'VE Schaufenster'} />
            <ul className={'mx-2 my-1 '}>
                {items.map((item, index) => (
                    <VEVitrineItem
                        key={index}
                        title={item.title}
                        excerpt={item.description}
                        _id={item.plan._id}
                    />
                ))}
            </ul>
        </>
    );
}
