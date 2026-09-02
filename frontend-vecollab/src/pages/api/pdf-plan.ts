import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import puppeteer from 'puppeteer';

// the footer is a standalone mini-document rendered by chrome into the page
// margin box, so it inherits none of the page styles and defaults to a nearly
// invisible font size -- everything has to be stated inline
const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const footerTemplate = (planName: string) => `
    <div style="width:100%; padding:0 18mm; font-family:sans-serif; font-size:8pt; color:#64748b; display:flex; justify-content:space-between;">
        <span>${escapeHtml(planName)}</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;

const saveAsPdf = async (url: string, accessToken: string, planName: string) => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROME_BIN || undefined,
        args: [`--no-sandbox`, `--headless`, `--disable-gpu`, `--disable-dev-shm-usage`],
    });

    try {
        const page = await browser.newPage();
        // send explicit access token to the page, because we cannot
        // make use of the user session cookie since it is a server-side headless browser
        await page.setExtraHTTPHeaders({
            Authorization: `Bearer ${accessToken}`,
        });
        await page.goto(url, {
            waitUntil: 'networkidle0',
        });

        return await page.pdf({
            format: 'a4',
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate: footerTemplate(planName),
        });
    } finally {
        await browser.close();
    }
};

// fetch just the plan's name, which is needed for the running footer and the
// download filename before the document itself is rendered
const getPlanName = async (planId: string, accessToken: string) => {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/planner/get?_id=${planId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await response.json();
        return data?.plan?.name || '';
    } catch (e) {
        return '';
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { planId, locale } = req.query;
    const gotoURL = process.env.NEXTAUTH_URL + '/' + locale + '/plan/pdf/' + planId;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return res.status(401).send('Unauthorized');
    }
    if (!planId) {
        return res.status(404).send('Not-Found');
    }

    const planName = await getPlanName(planId as string, token.accessToken);
    const fileName = (planName || 'Zusammenfassung').replace(/[\\/:*?"<>|]/g, '_');

    try {
        // generate pdf via a headless chrome browser that opens the pdf summary page
        // using puppeteer
        const pdf = await saveAsPdf(gotoURL as string, token.accessToken, planName);

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="plan.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}.pdf`
        );
        res.setHeader('Content-Type', 'application/pdf');

        return res.send(Buffer.from(pdf));
    } catch (e) {
        console.error('pdf generation failed', e);
        return res.status(500).send('PDF generation failed');
    }
}
