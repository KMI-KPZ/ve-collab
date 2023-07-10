import { Education, WorkExperience } from '@/interfaces/profile/profileInterfaces';
import BoxContentHeadline from './BoxContentHeadline';
import CVEducationItem from './CVEducationItem';
import { CVWorkItem } from './CVWorkItem';

interface Props {
    educations: Education[];
    workExperience: WorkExperience[];
}

export default function CVInformation({ educations, workExperience }: Props) {
    return (
        <div className={'min-h-[30rem] mx-2 my-1 flex'}>
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
                            timestamp_from={workExp.timestamp_from}
                            timestamp_to={workExp.timestamp_to}
                            city={workExp.city}
                            country={workExp.country}
                            additional_info={workExp.additional_info}
                            department={''}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
}
