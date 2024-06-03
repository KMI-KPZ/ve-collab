import { PlanPreview } from "../planner/plannerInterfaces";

export interface BackendUserSnippet {
    username: string;
    first_name: string;
    last_name: string;
    profile_pic: string;
    institution: string;
}

export interface BackendProfileSnippetsResponse {
    success: boolean;
    user_snippets: BackendUserSnippet[];
}

export interface BackendSearchResponse {
    status: number;
    success: boolean;
    users: any[];
    tags: any[];
    posts: any[];
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
    send_states: Record<string, string>;
}

export interface BackendFileSnippet {
    author: string,
    file_id: string,
    file_name: string,
    manually_uploaded: boolean,
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
    username: string,
    group: string,
    read_timeline: boolean,
    comment: boolean,
    post: boolean,
    read_files: boolean,
    write_files: boolean,
}

export interface BackendPostAuthor {
    username: string;
    profile_pic: string;
    first_name: string;
    last_name: string;
}

export interface BackendPostComment {
    _id: string;
    author: BackendPostAuthor;
    creation_date: string;
    pinned: boolean
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