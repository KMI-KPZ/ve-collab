if (!process.env.ETHERPAD_API_KEY) {
    throw new Error(`
      Please provide a valid ETHERPAD_API_KEY in .env.local .
    `);
}
let ETHERPAD_API_KEY = process.env.ETHERPAD_API_KEY;

if (!process.env.NEXT_PUBLIC_ETHERPAD_URL) {
    throw new Error(`
      Please provide a valid NEXT_PUBLIC_ETHERPAD_URL in .env.local .
    `);
}
let ETHERPAD_URL = process.env.NEXT_PUBLIC_ETHERPAD_URL;

export async function createPad(name: string) {
    try {
        let backendResponse = await fetch(
            ETHERPAD_URL + `/api/1.3.0/createPad?padID=${name}&apikey=${ETHERPAD_API_KEY}`,
            {}
        );
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function createGroupPad(groupId: string, name: string) {
    try {
        let backendResponse = await fetch(
            ETHERPAD_URL +
                `/api/1.3.0/createGroupPad?groupID=${groupId}&padName=${name}&apikey=${ETHERPAD_API_KEY}`,
            {}
        );
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function createAuthorIfNotExistsFor(authorMapper: string, name: string) {
    try {
        let backendResponse = await fetch(
            ETHERPAD_URL +
                `/api/1.3.0/createAuthorIfNotExistsFor?authorMapper=${authorMapper}&name=${name}&apikey=${ETHERPAD_API_KEY}`,
            {}
        );
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function createGroupIfNotExistsFor(groupMapper: string) {
    try {
        let backendResponse = await fetch(
            ETHERPAD_URL +
                `/api/1.3.0/createGroupIfNotExistsFor?groupMapper=${groupMapper}&apikey=${ETHERPAD_API_KEY}`,
            {}
        );
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}

export async function createSession(groupId: string, authorId: string) {
    // 01.01.3000 as unix timestamp in seconds
    const validUntil = Math.floor(new Date(3000, 1, 1).getTime() / 1000).toFixed(0);

    try {
        let backendResponse = await fetch(
            ETHERPAD_URL +
                `/api/1.3.0/createSession?groupID=${groupId}&authorID=${authorId}&validUntil=${validUntil}&apikey=${ETHERPAD_API_KEY}`,
            {}
        );
        return await backendResponse.json();
    } catch (e) {
        console.log('network error, probably backend down');
        return {};
    }
}
