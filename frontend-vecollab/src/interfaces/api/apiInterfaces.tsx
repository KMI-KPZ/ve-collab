export interface BackendUserSnippet {
    username: string,
    first_name: string,
    last_name: string,
    profile_pic: string,
    institution: string,
}

export interface BackendProfileSnippetsResponse {
    success: boolean,
    user_snippets: BackendUserSnippet[]
}

export interface BackendSearchResponse {
    status: number,
    success: boolean,
    users: any[],
    tags: any[],
    posts: any[]
}

export interface BackendChatroomSnippet{
    _id: string,
    members: string[],
    name?: string,
    last_message?: string,
}