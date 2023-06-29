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
