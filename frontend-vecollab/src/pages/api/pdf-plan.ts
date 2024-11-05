import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import puppeteer from 'puppeteer';

const saveAsPdf = async (url: string, accessToken: string) => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROME_BIN || undefined,
        args: [`--no-sandbox`, `--headless`, `--disable-gpu`, `--disable-dev-shm-usage`],
    });
    const page = await browser.newPage();
    // send explicit access token to the page, because we cannot
    // make use of the user session cookie since it is a server-side headless browser
    await page.setExtraHTTPHeaders({
        Authorization: `Bearer ${accessToken}`,
    });
    await page.goto(url, {
        waitUntil: 'networkidle0',
    });

    const result = await page.pdf({
        format: 'a4',
    });
    await browser.close();

    return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { planId, locale } = req.query;
    const gotoURL = process.env.NEXTAUTH_URL + '/' + locale + '/plan/pdf/' + planId;

    const token = await getToken({ req, secret: process.env.JWT_SECRET! });
    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    // generate pdf via a headless chrome browser that opens the pdf summary page
    // using puppeteer
    const pdf = await saveAsPdf(gotoURL as string, token.accessToken);

    res.setHeader('Content-Disposition', `attachment; filename="Zusammenfassung.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    return res.send(pdf);
}
