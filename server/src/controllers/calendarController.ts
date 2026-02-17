import { Request, Response } from 'express';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

// Private IP ranges (CIDR)
const isPrivateIp = (ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (ip === '::1') return true;
    return false;
};

export const getCalendarProxy = async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // 1. Validate URL Protocol
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return res.status(400).json({ error: 'Invalid URL protocol' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // 2. SSRF Protection: Resolve hostname and check for private IP
        try {
            const { address } = await lookup(parsedUrl.hostname);
            if (isPrivateIp(address)) {
                console.warn(`Blocked SSRF attempt to ${url} (resolved to ${address})`);
                return res.status(403).json({ error: 'Access to internal resources is forbidden' });
            }
        } catch (e) {
            // DNS resolution failed
            return res.status(400).json({ error: 'Invalid hostname' });
        }

        // Fetch the iCal feed
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'EduTrack/1.0 (Calendar Proxy)'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch iCal feed: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ error: 'Failed to fetch iCal feed from provider' });
        }

        const icsData = await response.text();

        // 3. XSS Protection & Content Validation
        // Ensure strictly it's iCal data to avoid serving arbitrary HTML
        if (!icsData.includes('BEGIN:VCALENDAR')) {
            return res.status(400).json({ error: 'Invalid iCal feed format' });
        }

        // Force strictly text/calendar and prevent sniffing
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=300');

        res.send(icsData);
    } catch (error) {
        console.error('Calendar Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching calendar feed' });
    }
};
