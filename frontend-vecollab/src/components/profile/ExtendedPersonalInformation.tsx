import Tabs from './Tabs';
import { AriaAttributes, DOMAttributes } from 'react';
import VEInformation from './VEInformation';
import TeachingAndResearchInformation from './TeachingAndResearchInformation';
import CVInformation from './CVInformation';
import { Course, Education, WorkExperience } from '@/interfaces/profile/profileInterfaces';

// have to declare "tabname" as a valid attribute for div tags, otherwise typescript is bothered
declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // extends React's HTMLAttributes
        tabname?: string;
    }
}

interface Props {
    veInfo: {
        veInterests: string[];
        veGoals: string[];
        experience: string[];
        preferredFormats: string[];
    };
    researchAndTeachingInfo: {
        researchInterests: string[];
        courses: Course[];
    };
    cvInfo: {
        educations: Education[];
        workExperience: WorkExperience[];
    };
}

export default function ExtendedPersonalInformation({
    veInfo,
    researchAndTeachingInfo,
    cvInfo,
}: Props) {
    return (
        <Tabs>
            <div tabname="VE-Infos">
                <VEInformation
                    veInterests={veInfo.veInterests}
                    veGoals={veInfo.veGoals}
                    experiences={veInfo.experience}
                    preferredFormats={veInfo.preferredFormats}
                />
            </div>
            <div tabname="Lehre & Forschung">
                <TeachingAndResearchInformation
                    researchInterests={researchAndTeachingInfo.researchInterests}
                    courses={researchAndTeachingInfo.courses}
                />
            </div>
            <div tabname="CV">
                <CVInformation educations={cvInfo.educations} workExperience={cvInfo.workExperience} />
            </div>
        </Tabs>
    );
}
