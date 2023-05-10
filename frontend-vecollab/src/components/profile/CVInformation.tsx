import BoxContentHeadline from './BoxContentHeadline';
import CVEducationItem from './CVEducationItem';
import { CVWorkItem } from './CVWorkItem';

interface Props {
    educations: Education[];
}

interface Education {
    institution: string;
    degree: string;
    department: string;
    timestamp_from: string;
    timestamp_to: string;
    additional_info: string;
}

export default function CVInformation({ educations }: Props) {
    return (
        <div className={'h-full mx-2 my-1 flex'}>
            {/* fixed height to enable scrolling instead of letting to box grow very large */}
            <div className={'w-1/2 overflow-y-auto content-scrollbar'}>
                <BoxContentHeadline className={'text-center'} text={'Ausbildung'} />
                <ul className={'divide-y mr-4'}>
                    {educations.map((education, index) => (
                        <CVEducationItem
                            key={index}
                            institution={education.institution}
                            level={education.degree}
                            field={education.department}
                            timeStampFrom={education.timestamp_from}
                            timeStampTo={education.timestamp_to}
                            additionalInformation={education.additional_info}
                        />
                    ))}
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
