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

export interface BackendSpace {
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
