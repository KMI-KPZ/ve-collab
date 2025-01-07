import * as path from 'node:path';
import fs from 'fs';
import { NextApiResponse } from 'next';

function generateSiteMapVideo(videoSitemapString: string) {
    return `${videoSitemapString}`;
}

export async function getServerSideProps({ res }: { res: NextApiResponse }) {
    const filePath = path.join(process.cwd(), 'src', 'data', 'sitemap-video.xml'); // Adjust path as needed
    const videoSitemapString: string = fs.readFileSync(filePath, 'utf-8');
    // We generate the XML sitemap with the combined static and dynamic routes
    const sitemap = generateSiteMapVideo(videoSitemapString);

    res.setHeader('Content-Type', 'application/xml');
    res.write(sitemap);
    res.end();

    return {
        props: {},
    };
}

// Dummy that next.js renders the page with xml content
export default function SiteMapVideo() {}
