import BoxContentHeadline from './BoxContentHeadline';
import CVEducationItem from './CVEducationItem';
import { CVWorkItem } from './CVWorkItem';

interface Props {
    educations: Education[];
    workExperience: WorkExperience[];
}

interface Education {
    institution: string;
    degree: string;
    department: string;
    timestamp_from: string;
    timestamp_to: string;
    additional_info: string;
}

interface WorkExperience {
    position: string;
    institution: string;
    department: string;
    timestamp_from: string;
    timestamp_to: string;
    city: string;
    country: string;
    additional_info: string;
}

export default function CVInformation({ educations, workExperience }: Props) {
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
                    {workExperience.map((workExp, index) => (
                        <CVWorkItem
                            key={index}
                            position={workExp.position}
                            institution={workExp.institution}
                            timeStampFrom={workExp.timestamp_from}
                            timeStampTo={workExp.timestamp_to}
                            duration={'6 Monate'}
                            city={workExp.city}
                            country={workExp.country}
                            additionalInformation={workExp.additional_info}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
}
