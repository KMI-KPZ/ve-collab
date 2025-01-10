import {
    BackendChatMessage,
    BackendChatroomSnippet,
    BackendPost,
    BackendGroup,
    BackendGroupACLEntry,
    BackendUserSnippet,
    BackendUser,
    BackendProfile,
    BackendUserACLEntry,
} from '@/interfaces/api/apiInterfaces';
import { Notification } from '@/interfaces/socketio';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { signIn, useSession } from 'next-auth/react';
import useSWR, { KeyedMutator } from 'swr';
import { VEPlanSnippet } from '@/interfaces/profile/profileInterfaces';
import {
    IMaterialNode,
    INode,
    INodeWithLections,
    ITopLevelNode,
} from '@/interfaces/material/materialInterfaces';

if (!process.env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    throw new Error(`
      Please provide a valid NEXT_PUBLIC_BACKEND_BASE_URL in .env.local .
    `);
}
let BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

const swrConfig = {
    revalidateOnFocus: false,
};

interface APIErrorResponse {
    success: boolean;
    reason: string;
    [x: string]: any;
}

class APIError extends Error {
    apiResponse: APIErrorResponse;
    constructor(message: string, apiResponse: APIErrorResponse) {
        super(message);
        this.apiResponse = apiResponse;
    }
}

// SWR fetcher for get requests
const GETfetcher = (relativeUrl: string, accessToken?: string, autoResignin: boolean = true) =>
    fetch(BACKEND_BASE_URL + relativeUrl, {
        headers: { Authorization: 'Bearer ' + accessToken },
    }).then(async (res) => {
        if (res.status === 401 && autoResignin) {
            console.log('forced new signIn by api call');
            return signIn('keycloak');
        } else if (res.status > 299) {
            throw new APIError('Error from Backend', await res.json());
        }
        return res.json();
    });

const POSTfetcher = (
    relativeUrl: string,
    data?: Record<string, any>,
    accessToken?: string,
    autoResignin: boolean = true
) =>
    fetchPOST(relativeUrl, data, accessToken).then((res) => {
        if (res.status === 401 && autoResignin) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        } else if (res.status > 299) {
            throw new APIError('Error from Backend', res);
        }
        return res;
    });

// TODO duplication of useIsAdminCheck()
export function useIsGlobalAdmin(accessToken: string): boolean {
    const { data } = useSWR(
        accessToken ? [`/admin_check`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        Object.assign({}, swrConfig, { revalidateOnFocus: true })
    );

    return data?.is_admin || false;
}

export function useGetProfileSnippets(
    usernames: string[],
    accessToken: string
): {
    data: BackendUserSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        usernames ? ['/profile_snippets', accessToken] : null,
        ([url, token]) => POSTfetcher(url, { usernames: usernames ? usernames : '' }, token),
        swrConfig
    );

    return {
        data: isLoading || error || !usernames ? [] : data.user_snippets,
        isLoading,
        error,
        mutate,
    };
}

export function useGetOwnProfile(accessToken: string): {
    data: BackendUser;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        accessToken ? [`/profileinformation`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error ? {} : data,
        isLoading,
        error,
        mutate,
    };
}

export function useGetUsers(accessToken?: string): {
    data: { [username: string]: BackendUserSnippet };
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        accessToken ? [`/users/list`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error || data,
        isLoading,
        error,
        mutate,
    };
}

export function useGetAvailablePlans(accessToken: string): {
    data: IPlan[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/planner/get_available', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: !data || isLoading || error ? [] : data.plans,
        isLoading,
        error,
        mutate,
    };
}

export function useGetPlanById(
    planId: string,
    shouldFetch: boolean = true
): {
    data: IPlan;
    isLoading: boolean;
    error: APIError;
    mutate: KeyedMutator<any>;
} {
    const { data: session } = useSession();
    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch ? [`/planner/get?_id=${planId}`, session?.accessToken] : null,
        ([url, token]) => GETfetcher(url, token, shouldFetch),
        swrConfig
    );

    return {
        data: !shouldFetch ? {} : isLoading || error ? {} : data.plan,
        isLoading,
        error,
        mutate,
    };
}

export function useGetPublicPlansOfCurrentUser(
    accessToken: string,
    username: string
): {
    data: VEPlanSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        [`/planner/get_public_of_user?username=${username}`, accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data:
            isLoading || error
                ? []
                : data.plans.map((plan: any) => ({
                      _id: plan._id,
                      name: plan.name,
                  })),
        isLoading,
        error,
        mutate,
    };
}

export function useGetAllPlans(accessToken: string): {
    data: IPlan[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/planner/get_all', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error ? [] : data.plans,
        isLoading,
        error,
        mutate,
    };
}

export function useGetMatching(
    shouldFetch: boolean,
    accessToken: string
): {
    data: BackendUserSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch ? ['/matching', accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: !shouldFetch
            ? []
            : isLoading || error
            ? []
            : data.matching_hits.sort((a: any, b: any) => b.score - a.score),
        isLoading,
        error,
        mutate,
    };
}

export function useGetExcludedFromMatching(accessToken: string): {
    data: boolean;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, isLoading, error, mutate } = useSWR(
        accessToken ? ['/matching_exclusion_info', accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error ? false : data?.excluded_from_matching,
        isLoading,
        error,
        mutate,
    };
}

export function useGetNotifications(accessToken: string): {
    data: Notification[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/notifications', accessToken],
        ([url, token]) => GETfetcher(url, token),
        Object.assign({}, swrConfig, { revalidateOnFocus: true })
    );
    return {
        data:
            isLoading || error
                ? []
                : data.notifications.sort((a: Notification, b: Notification) => {
                      return a.creation_timestamp < b.creation_timestamp ? 1 : -1;
                  }),
        isLoading,
        error,
        mutate,
    };
}

export function useGetChatrooms(accessToken: string): {
    data: BackendChatroomSnippet[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/chatroom/get_mine', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: !data || isLoading || error ? [] : data.rooms,
        isLoading,
        error,
        mutate,
    };
}

export function useGetChatroomHistory(
    accessToken: string,
    chatroomId: string
): {
    data: BackendChatMessage[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        [`/chatroom/get_messages?room_id=${chatroomId}`, accessToken],
        ([url, token]) => GETfetcher(url, token),
        Object.assign({}, swrConfig, { revalidateOnFocus: true })
    );
    return {
        data: isLoading || error ? [] : data.messages,
        isLoading,
        error,
        mutate,
    };
}

// TODO ducplication of isGlobalAdmin()?
export function useGetCheckAdminUser(accessToken: string): {
    data: boolean;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/admin_check', accessToken],
        ([url, token]) => GETfetcher(url, token),
        Object.assign({}, swrConfig, { revalidateOnFocus: true })
    );
    return {
        data: isLoading || error ? false : data.is_admin,
        isLoading,
        error,
        mutate,
    };
}

export function useGetGroup(
    accessToken: string,
    groupId?: string
): {
    data: BackendGroup;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        groupId ? [`/spaceadministration/info?id=${groupId}`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error || !groupId ? null : data.space,
        isLoading,
        error,
        mutate,
    };
}

export function useGetAllGroups(accessToken: string): {
    data: BackendGroup[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/spaceadministration/list', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error ? [] : data.spaces,
        isLoading,
        error,
        mutate,
    };
}

export function useGetMyGroups(accessToken: string): {
    data: BackendGroup[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/spaceadministration/my', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error ? [] : data.spaces,
        isLoading,
        error,
        mutate,
    };
}

export function useGetMyGroupInvites(accessToken: string): {
    data: BackendGroup[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/spaceadministration/pending_invites', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error ? [] : data.pending_invites,
        isLoading,
        error,
        mutate,
    };
}

export function useGetMyGroupRequests(accessToken: string): {
    data: BackendGroup[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        ['/spaceadministration/pending_requests', accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error ? [] : data.pending_requests,
        isLoading,
        error,
        mutate,
    };
}

export function useGetMyGroupACLEntry(
    accessToken: string,
    groupId?: string
): {
    data: BackendGroupACLEntry;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        groupId ? [`/space_acl/get?space=${groupId}`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error || !groupId ? null : data.acl_entry,
        isLoading,
        error,
        mutate,
    };
}

export function useGetMyACL(accessToken: string): {
    data: BackendUserACLEntry;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        [`/global_acl/get`, accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );
    return {
        data: isLoading || error || data.acl_entry,
        isLoading,
        error,
        mutate,
    };
}

export function useGetTimeline(
    accessToken: string,
    toDate?: string,
    limit?: number,
    group?: string,
    user?: string,
    adminDashboard?: boolean
): {
    data: BackendPost[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    let endpointUrl = '/timeline';
    if (group) {
        endpointUrl += `/space/${group}`;
    } else if (user) {
        endpointUrl += `/user/${user}`;
    } else if (adminDashboard) {
        // empty, adminDashboard requests to bare /timeline
    } else {
        endpointUrl += `/you`;
    }
    endpointUrl += `?to=${toDate}&limit=${limit}`;

    const { data, error, isLoading, mutate } = useSWR(
        [endpointUrl, accessToken],
        ([url, token]) => GETfetcher(url, token),
        Object.assign({}, swrConfig, { revalidateOnFocus: true })
    );

    return {
        data: !data || isLoading || error ? [] : data.posts,
        isLoading,
        error,
        mutate,
    };
}

export function useGetPinnedPosts(
    accessToken: string,
    group: string,
    limit?: number
): {
    data: BackendPost[];
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        group ? [`/timeline/space/${group}?limit=${limit || 3}`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error || !group ? [] : data.pinned_posts,
        isLoading,
        error,
        mutate,
    };
}

export function useGetPost(
    accessToken: string,
    post_id: string
): {
    data: BackendPost;
    isLoading: boolean;
    error: any;
    mutate: KeyedMutator<any>;
} {
    const { data, error, isLoading, mutate } = useSWR(
        post_id ? [`/posts?post_id=${post_id}`, accessToken] : null,
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error || !post_id ? '' : data.post,
        isLoading,
        error,
        mutate,
    };
}

export function useGetSearchResults(
    search: string,
    filterBy?: string[]
): {
    data: { posts: BackendPost[]; spaces: BackendGroup[]; users: BackendProfile[] };
    isLoading: boolean;
    error: APIError;
    mutate: KeyedMutator<any>;
} {
    const { data: session } = useSession();
    const defaultFilter = ['posts', 'users', 'spaces'];
    filterBy =
        filterBy && filterBy.every((f) => defaultFilter.includes(f)) ? filterBy : defaultFilter;
    const filter = filterBy.reduce((acc, cur) => `${acc}${cur}=true&`, '');
    const { data, error, isLoading, mutate } = useSWR(
        [`/search?query=${search}&${filter}`, session?.accessToken],
        ([url, token]) => GETfetcher(url, token),
        swrConfig
    );

    return {
        data: isLoading || error ? {} : data,
        isLoading,
        error,
        mutate,
    };
}

export async function fetchGET(relativeUrl: string, accessToken?: string) {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            headers: headers,
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function fetchPOST(
    relativeUrl: string,
    payload?: Record<string, any>,
    accessToken?: string,
    asFormData: boolean = false
) {
    const headers: { Authorization?: string } = {};
    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    function getFormData(payload: any) {
        const formData = new FormData();
        Object.keys(payload).forEach((key) => formData.append(key, payload[key]));
        return formData;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            method: 'POST',
            headers,
            body: asFormData ? getFormData(payload) : JSON.stringify(payload),
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return await backendResponse.json();
    } catch (e) {
        console.log(e);
        return {};
    }
}

export async function fetchDELETE(
    relativeUrl: string,
    payload?: Record<string, any>,
    accessToken?: string
) {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify(payload),
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function fetchImage(relativeUrl: string, accessToken?: string): Promise<Blob> {
    const headers: { Authorization?: string } = {};

    if (accessToken) {
        headers['Authorization'] = 'Bearer ' + accessToken;
    }

    try {
        let backendResponse = await fetch(BACKEND_BASE_URL + relativeUrl, {
            headers: headers,
        });
        if (backendResponse.status === 401) {
            console.log('forced new signIn by api call');
            signIn('keycloak');
        }
        return backendResponse.blob();
    } catch (e) {
        console.log('network error, probably backend down');
        return new Blob();
    }
}

export async function fetchTaxonomy(): Promise<INode[]> {
    const data = await GETfetcher('/material_taxonomy', '', false);
    return data.taxonomy;
}

export async function getTopLevelNodes(tax?: INode[]): Promise<ITopLevelNode[]> {
    const taxonomy = tax || (await fetchTaxonomy());
    return taxonomy.filter((node: any) => node.parent === 0) as ITopLevelNode[];
}

export async function getNodeByText(nodeText: string, tax?: INode[]): Promise<INode> {
    const taxonomy = tax || (await fetchTaxonomy());
    return taxonomy.find((node: any) => node.text === nodeText) as INode;
}

export async function getChildrenOfNode(nodeId: number, tax?: INode[]): Promise<INode[]> {
    const taxonomy = tax || (await fetchTaxonomy());
    return taxonomy.filter((node: any) => node.parent === nodeId);
}

export async function getChildrenOfNodeByText(nodeText: string, tax?: INode[]): Promise<INode[]> {
    const taxonomy = tax || (await fetchTaxonomy());
    const nodeId = taxonomy.find((node: INode) => node.text === nodeText)?.id;
    return taxonomy.filter((node: INode) => node.parent === nodeId) as INode[];
}

export async function getSiblingsOfNodeByText(nodeText: string, tax?: INode[]): Promise<INode[]> {
    const taxonomy = tax || (await fetchTaxonomy());
    const node = taxonomy.find((node: INode) => node.text === nodeText);
    return node ? taxonomy.filter((a: any) => a.parent === node.parent) : [];
}

export async function getMaterialNodesOfNodeByText(
    nodeText: string,
    tax?: INode[]
): Promise<IMaterialNode[]> {
    const taxonomy = tax || (await fetchTaxonomy());
    const nodeId = taxonomy.find((node: INode) => node.text === nodeText)?.id;
    return taxonomy.filter((node: INode) => node.parent === nodeId) as IMaterialNode[];
}

export async function getMaterialNodePath(
    nodeId: number,
    tax?: INode[]
): Promise<{ bubble: ITopLevelNode; category: INode; material: IMaterialNode }> {
    const taxonomy = tax || (await fetchTaxonomy());
    const materialNode = taxonomy.find((node: INode) => node.id === nodeId) as IMaterialNode;
    const categoryNode = taxonomy.find((node: INode) => node.id === materialNode.parent) as INode;
    const bubbleNode = taxonomy.find(
        (node: INode) => node.id === categoryNode.parent
    ) as ITopLevelNode;

    return { bubble: bubbleNode, category: categoryNode, material: materialNode };
}

export async function getNodesOfNodeWithLections(
    node: INode,
    tax?: INode[]
): Promise<undefined | INodeWithLections[]> {
    if (!node) return [] as INodeWithLections[];

    const taxonomy = tax || (await fetchTaxonomy());
    const nodes = taxonomy.filter((n) => n.parent === node.id);

    return nodes.map((n) => {
        const lections = taxonomy.filter((m) => m.parent == n.id);
        return { ...n, lections };
    }) as INodeWithLections[];
}
