// Not included (not public accessible, error pages, user-specific pages):

// api/...
// orcidAccountLinkCallback
// LEARNINGMATERIAL_EDIT: '/learning-material/edit',
// MEETING_ID: `/meeting/${id}`,
// PLAN_PDF_PLANID: `/plan/pdf/${planId}`,
// PROFILE_EDIT: '/profile/edit',
// ERROR500: '/500',
// ERROR404: '/404',
// ETHERPAD: `/etherpad/${id}`,

import { INode } from '@/interfaces/material/materialInterfaces';
import { getChildrenOfNode, getMaterialNodesOfNodeByText } from '@/lib/backend';

export const ROUTES = {
    HOME: '',
    SEARCH: '/search',
    PLANS: '/plans',
    MATCHING: '/matching',
    GROUPS: '/groups',

    // VE-Designer
    /*    VEDESIGNER_STEP_ID: `/ve-designer/step/${id}`,*/
    VEDESIGNER_CHECKLIST: '/ve-designer/checklist',
    VEDESIGNER_EVALUATION: '/ve-designer/evaluation',
    VEDESIGNER_FINISH: '/ve-designer/finish',
    VEDESIGNER_INSTITUTIONS: '/ve-designer/institutions',
    VEDESIGNER_LEARNINGENV: '/ve-designer/learning-env',
    VEDESIGNER_LEARNINGGOALS: '/ve-designer/learning-goals',
    VEDESIGNER_LECTURES: '/ve-designer/lectures',
    VEDESIGNER_METHODOLOGY: '/ve-designer/methodology',
    VEDESIGNER_NAME: '/ve-designer/name',
    VEDESIGNER_PARTNERS: '/ve-designer/partners',
    VEDESIGNER_POSTPROCESS: '/ve-designer/post-process',
    VEDESIGNER_STEPS: '/ve-designer/steps',
    VEDESIGNER_TARGETGROUPS: '/ve-designer/target-groups',

    // PROFILE
    PROFILE: '/profile',

    // LEARNINGMATERIAL
    LEARNINGMATERIAL: '/learning-material',
};

export const ROUTES_DYNAMIC = {
    // POST
    /*    POST_ID: `/post/${postId}`,*/

    // PLAN TODO maybe add
    /*    PLAN_ID: `/plan/${planId}`,*/

    // LEARNINGMATERIAL
    LEARNINGMATERIAL_CLUSTER: `/learning-material/${cluster}`,
    // LEARNINGMATERIAL_CLUSTER_NODE: `/learning-material/${cluster}/${node}`,
    LEARNINGMATERIAL_CLUSTER_NODE_SLUG: `/learning-material/${cluster}/${node}/${slug}`,

    // GROUP TODO maybe add
    /*    GROUP_ID: `/group/${groupId}`,*/

    // MATERIALPERMALINK TODO maybe add
    // MATERIALPERMALINK_ID: `/materialPermalink/${materialId}`,

    // PROFILE TODO maybe add
    /*    PROFILE_USER_USERNAME: `/profile/user/${username}`,*/
};

// top bubbles=[cluster]
// const cluster = await getTopLevelNodes();

// kleineren bubbles = [nodes]
/*const nodes: { [key: string]: INode[] } = {};

await Promise.all(
    cluster.map(async (bubble) => {
        const nodesInBubble = await getChildrenOfNode(bubble.id);
        nodes[bubble.text] = nodesInBubble;
    })
);*/

// lections = [slug]
/*const lectionsOfNode = await getMaterialNodesOfNodeByText(currentNode.text);*/
