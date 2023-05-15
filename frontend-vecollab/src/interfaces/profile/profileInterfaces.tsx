export interface PersonalInformation {
    firstName: string;
    lastName: string;
    institution: string;
    bio: string;
    expertise: string;
    birthday: string;
    languageTags: LanguageTag[];
}

export interface LanguageTag {
    id: string;
    text: string;
}

export interface ResearchTag {
    id: string;
    text: string;
}

export interface VEInformation {
    veInterests: string[];
    veGoals: string[];
    experience: string[];
    preferredFormats: string[];
}

export interface Course {
    title: string;
    academic_courses: string;
    semester: string;
}

export interface Education {
    institution: string;
    degree: string;
    department: string;
    timestamp_from: string;
    timestamp_to: string;
    additional_info: string;
}

export interface WorkExperience {
    position: string;
    institution: string;
    department: string;
    timestamp_from: string;
    timestamp_to: string;
    city: string;
    country: string;
    additional_info: string;
}
