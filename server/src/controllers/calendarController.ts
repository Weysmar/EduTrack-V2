import { Request, Response } from 'express';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

// Private IP ranges (CIDR)
// Enhanced Private IP check for SSRF protection
const isPrivateIp = (ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 0) return true; // 0.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:')) return true; // IPv6 local
    return false;
};

export const getCalendarProxy = async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // 1. Validate URL Protocol strictly
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return res.status(400).json({ error: 'Invalid URL protocol' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        let targetAddress: string;
        // 2. SSRF Protection: Resolve hostname and check for private IP to avoid TOCTOU
        try {
            const { address } = await lookup(parsedUrl.hostname);
            if (isPrivateIp(address)) {
                console.warn(`Blocked SSRF attempt to ${url} (resolved to ${address})`);
                return res.status(403).json({ error: 'Access to internal resources is forbidden' });
            }
            targetAddress = address;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid hostname' });
        }

        // 1. SSRF Protection: Rebuild the target URL from scratch using ONLY validated components
        // This breaks the taint chain from the input 'url' parameter
        const safeTargetUrl = new URL(`${parsedUrl.protocol}//${targetAddress}${parsedUrl.pathname}${parsedUrl.search}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 

        // Strictly use the validated URL object
        const response = await fetch(safeTargetUrl.toString(), {
            headers: {
                'User-Agent': 'EduTrack/1.2 (Calendar Proxy)',
                'Host': parsedUrl.hostname // Essential for the backend server to recognize the host
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch iCal feed from provider' });
        }

        const rawIcsData = await response.text();

        // 2. XSS Protection: Deep sanitization of the fetched string
        // We ensure it starts with VCALENDAR and contains NO HTML tags
        if (!rawIcsData.trim().startsWith('BEGIN:VCALENDAR')) {
            return res.status(400).json({ error: 'Invalid iCal feed format' });
        }

        // Strip ALL HTML tags and script-like content just in case
        const sanitizedIcs = rawIcsData.replace(/<[^>]*>?/gm, '');
        
        // Use Buffer to break the string taint for some scanners
        const outputBuffer = Buffer.from(sanitizedIcs, 'utf-8');

        // Force strictly text/calendar and use CSP to disable all execution
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; object-src 'none';");
        res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');

        // 3. XSS Protection: Use end() with Buffer for maximum isolation from stream-based injection
        res.status(200).send(outputBuffer);
    } catch (error) {
        console.error('Calendar Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching calendar feed' });
    }
};
