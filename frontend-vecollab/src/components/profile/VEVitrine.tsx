import BoxHeadline from './BoxHeadline';
import VEVitrineItem from './VEVitrineItem';

export default function VEVitrine() {
    let excerpt =
        'Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.';

    return (
        <>
            <BoxHeadline title={'VE Schaufenster'} />
            <ul className={'mx-2 my-1 '}>
                <VEVitrineItem
                    title={'Menschenrechte in der Welt'}
                    excerpt={excerpt}
                    date={'01.01.23'}
                />
                <VEVitrineItem title={'Gleichberechtigung'} excerpt={excerpt} date={'01.01.23'} />
                <VEVitrineItem
                    title={'Demokratieverständnis'}
                    excerpt={excerpt}
                    date={'01.01.23'}
                />
                <VEVitrineItem
                    title={'noch ein langer Titel der über 2 Zeilen geht'}
                    excerpt={excerpt}
                    date={'01.01.23'}
                />
            </ul>
        </>
    );
}
