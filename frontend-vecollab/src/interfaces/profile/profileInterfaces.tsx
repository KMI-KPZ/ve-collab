export interface PersonalInformation {
    firstName: string;
    lastName: string;
    institution: string;
    bio: string;
    expertise: string;
    birthday: string;
    profilePicId?: string;
    languages: string[];
}

export interface LanguageTag {
    id: string;
    text: string;
}

export interface VEInformation {
    veInterests: string[];
    veContents: string[];
    veGoals: string[];
    experience: string[];
    interdisciplinaryExchange: boolean;
    preferredFormat: string;
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

export interface UserSnippet {
    profilePicUrl: string;
    name: string;
    preferredUsername: string;
    institution: string;
}

export interface UserAccessSnippet {
    profilePicUrl: string;
    name: string;
    preferredUsername: string;
    institution: string;
    access: string;
}

export interface VEPlanSnippet {
    _id: string;
    name: string;
}

export interface VEWindowItem {
    plan: VEPlanSnippet;
    title: string;
    description: string;
}
