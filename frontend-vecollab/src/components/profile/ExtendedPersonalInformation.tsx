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
import { useTranslation } from 'next-i18next';

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
    const { t } = useTranslation(['community', 'common']);

    return (
        <Tabs>
            <div tabid="ve_info" tabname={t("ve_info")}>
                <VEInformation veInfo={veInfo} />
            </div>
            <div tabid="teaching_research" tabname={t("research_and_teaching")}>
                <TeachingAndResearchInformation researchAndTeachingInfo={researchAndTeachingInfo} />
            </div>
            <div tabid="cv" tabname={t("cv")}>
                <CVInformation cvInfo={cvInfo} />
            </div>
        </Tabs>
    );
}
