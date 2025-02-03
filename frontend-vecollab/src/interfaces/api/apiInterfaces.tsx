import { PlanPreview } from '../planner/plannerInterfaces';
import {
    Course,
    Education,
    Institution,
    NotificationSettings,
    VEWindowItem,
    WorkExperience,
} from '../profile/profileInterfaces';

export interface BackendUserSnippet {
    username: string;
    first_name: string;
    last_name: string;
    profile_pic: string;
    institution: string;
    chosen_achievement?: null | ChosenAchievement;
}

export interface BackendProfileSnippetsResponse {
    success: boolean;
    user_snippets: BackendUserSnippet[];
}

export interface BackendUser {
    user_id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    followers: string[];
    follows: string[];
    spaces: string[];
    profile: BackendProfile;
    profile_pic: string;
    chosen_achievement?: null | ChosenAchievement;
}

// TODO Backend should return BackendUser data, but currently does not; eg at /profilinformation
export interface BackendUser25 {
    user_id: string;
    username: string;
    role: string;
    followers: string[];
    follows: string[];
    spaces: string[];
    profile: BackendProfile;
}

export interface BackendProfile {
    achievements: Achievements;
    address: string;
    bio: string;
    birthday: string;
    chosen_institution_id: string;
    chosen_achievement: null | ChosenAchievement;
    courses: Course[];
    educations: Education[];
    excluded_from_matching: boolean;
    experience: string[];
    expertise: string;
    first_name: string;
    gender: string;
    institutions: Institution[];
    interdisciplinary_exchange: boolean;
    languages: string[];
    last_name: string;
    lms: string[];
    preferred_format: string;
    profile_pic: string;
    research_tags: string[];
    tools: string[];
    username: string;
    ve_contents: string[];
    ve_goals: string[];
    ve_interests: string[];
    ve_ready: boolean;
    ve_window: VEWindowItem[];
    work_experience: WorkExperience[];
    notification_settings: NotificationSettings;
}

export interface BackendSearchResponse {
    status: number;
    success: boolean;
    users: any[];
    tags: any[];
    posts: any[];
}

export interface BackendMatchingUser {
    username: string;
    first_name: string;
    last_name: string;
    profile_pic: string;
    institution: string;
    ve_ready: boolean;
    chosen_achievement?: null | ChosenAchievement;
    score: number;
}

export interface BackendChatroomSnippet {
    _id: string;
    members: string[];
    name?: string;
    last_message?: BackendChatMessage;
}

export interface BackendChatMessage {
    _id: string;
    sender: string;
    recipients?: string[];
    message: string;
    creation_date: string;
    send_states: [
        {
            username: string;
            send_state: 'sent' | 'pending' | 'acknowledged';
        }
    ];
}

export interface BackendFileSnippet {
    author: string;
    file_id: string;
    file_name: string;
    manually_uploaded: boolean;
}

export interface BackendGroup {
    _id: string;
    name: string;
    admins: string[];
    members: string[];
    files: BackendFileSnippet[];
    invisible: boolean;
    joinable: boolean;
    invites: string[];
    requests: string[];
    space_pic: string;
    space_description: string;
}

export interface BackendGroupACLEntry {
    username: string;
    group: string;
    read_timeline: boolean;
    comment: boolean;
    post: boolean;
    read_files: boolean;
    write_files: boolean;
}

export interface BackendUserACLEntry {
    role: string;
    create_space: boolean;
}

export interface BackendPostAuthor {
    username: string;
    profile_pic: string;
    first_name: string;
    last_name: string;
    chosen_achievement: null | ChosenAchievement;
}

export interface BackendPostComment {
    _id: string;
    author: BackendPostAuthor;
    creation_date: string;
    pinned: boolean;
    text: string;
}

export interface BackendPostFile {
    file_id: string;
    file_name: string;
    file_type: string;
    author: string;
}

export interface BackendPost {
    _id: string;
    author: BackendPostAuthor;
    comments: BackendPostComment[];
    creation_date: string;
    files: BackendPostFile[];
    likers: string[];
    pinned: boolean;
    plans: PlanPreview[];
    space: string;
    tags: string[];
    text: string;
    // wordpress_post_id: string // deprecated

    isRepost?: boolean;
    originalCreationDate?: string;
    repostAuthor?: BackendPostAuthor;
    repostText?: string;
}

export interface Achievements {
    social: Achievement;
    ve: Achievement;
}

export interface Achievement {
    level: number;
    progress: number;
    next_level: number;
}

export interface ChosenAchievement {
    type: 'social' | 've' | '';
    level: number;
}
