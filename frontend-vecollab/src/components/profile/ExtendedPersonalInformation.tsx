import Tabs from './Tabs';
import { AriaAttributes, DOMAttributes } from 'react';
import VEInformation from './VEInformation';
import TeachingAndResearchInformation from './TeachingAndResearchInformation';
import CVInformation from './CVInformation';
import {
    Education,
    ResearchAndTeachingInformation,
    VEInformation as IVEInformation, // name collision avoidance with VEInformation component
    WorkExperience,
} from '@/interfaces/profile/profileInterfaces';

// have to declare "tabname" as a valid attribute for div tags, otherwise typescript is bothered
declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // extends React's HTMLAttributes
        tabname?: string;
        tabid?: string;
    }
}

interface Props {
    veInfo: IVEInformation;
    researchAndTeachingInfo: ResearchAndTeachingInformation;
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
            <div tabid='ve_info' tabname="VE-Infos">
                <VEInformation veInfo={veInfo} />
            </div>
            <div tabid='teaching_research' tabname="Lehre & Forschung">
                <TeachingAndResearchInformation researchAndTeachingInfo={researchAndTeachingInfo} />
            </div>
            <div tabid='cv' tabname="CV">
                <CVInformation cvInfo={cvInfo} />
            </div>
        </Tabs>
    );
}
