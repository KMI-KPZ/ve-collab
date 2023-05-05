import BoxContentHeadline from './BoxContentHeadline';
import CVEducationItem from './CVEducationItem';
import { CVWorkItem } from './CVWorkItem';

export default function CVInformation() {
    return (
        <div className={'h-full mx-2 my-1 flex'}>
            {/* fixed height to enable scrolling instead of letting to box grow very large */}
            <div className={'w-1/2 overflow-y-auto content-scrollbar'}>
                <BoxContentHeadline className={'text-center'} text={'Ausbildung'} />
                <ul className={'divide-y mr-4'}>
                    <CVEducationItem
                        institution={'Universität Leipzig'}
                        level={'Master of Science'}
                        field={'Informatik'}
                        timeStampFrom={'2020'}
                        timeStampTo={'2022'}
                        additionalInformation={'Zusatzinfos, z.B. Note'}
                    />
                    <CVEducationItem
                        institution={'Universität Leipzig'}
                        level={'Bachelor of Science'}
                        field={'Informatik'}
                        timeStampFrom={'2016'}
                        timeStampTo={'2020'}
                        additionalInformation={'Zusatzinfos, z.B. Note'}
                    />
                    <CVEducationItem
                        institution={'Gymnasium'}
                        level={'Abitur'}
                        timeStampFrom={'2009'}
                        timeStampTo={'2016'}
                    />
                    <CVEducationItem
                        institution={'Grundschule'}
                        level={'gymnasiale Bildungsempfehlung'}
                        timeStampFrom={'2005'}
                        timeStampTo={'2009'}
                    />
                </ul>
            </div>
            <div className={'w-1/2 overflow-y-auto content-scrollbar'}>
                <BoxContentHeadline className={'text-center'} text={'Berufserfahrung'} />
                <ul className={'divide-y ml-4'}>
                    <CVWorkItem
                        position={'wissenschaftlicher Mitarbeiter'}
                        institution={'Institut für angewandte Informatik (InfAI) e.V.'}
                        timeStampFrom={'10/2022'}
                        timeStampTo={'heute'}
                        duration={'6 Monate'}
                        city={'Leipzig'}
                        additionalInformation={'Projekt VE-Collab'}
                    />
                    <CVWorkItem
                        position={'wissenschaftliche Hilfskraft'}
                        institution={'Universität Leipzig, Rechenzentrum (URZ)'}
                        timeStampFrom={'05/2018'}
                        timeStampTo={'10/2022'}
                        duration={'4 Jahre, 6 Monate'}
                        city={'Leipzig'}
                        additionalInformation={
                            'Entwicklertätigkeiten in diversen Projekten, z.B. SB:Digital, SO-SERVE'
                        }
                    />
                </ul>
            </div>
        </div>
    );
}
