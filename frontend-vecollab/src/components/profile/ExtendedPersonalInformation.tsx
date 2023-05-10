import { RxDotFilled } from 'react-icons/rx';
import Tabs from './Tabs';
import { AriaAttributes, DOMAttributes } from 'react';
import VEInformation from './VEInformation';
import TeachingAndResearchInformation from './TeachingAndResearchInformation';
import CVInformation from './CVInformation';

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

interface Course {
    title: string;
    academic_courses: string;
    semester: string;
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
