import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer, { CookieParam } from 'puppeteer';

const saveAsPdf = async (url: string, cookies: CookieParam[]) => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROME_BIN || undefined,
        args: [`--no-sandbox`, `--headless`, `--disable-gpu`, `--disable-dev-shm-usage`],
    });
    const page = await browser.newPage();
    page.setCookie(...cookies);

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
    const { planId } = req.query; // pass the plan id as query parameter
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const gotoURL = url.protocol + '//' + url.host + '/plan/pdf/' + planId;

    // transform cookies to puppeteer format ({name: 'cookieName', value: 'cookieValue', domain: 'cookieDomain'})
    const cookies = Object.keys(req.cookies).map((cookieName) => ({
        name: cookieName,
        value: req.cookies[cookieName]!,
        domain: url.host,
    }));

    res.setHeader('Content-Disposition', `attachment; filename="Zusammenfassung.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    const pdf = await saveAsPdf(gotoURL as string, cookies);

    return res.send(pdf);
}
