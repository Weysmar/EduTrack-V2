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

        // 1. Normalize Protocol (handle webcal:// and webcals:// from Google Calendar)
        let normalizedUrl = url.trim();
        if (normalizedUrl.startsWith('webcal://')) {
            normalizedUrl = 'https://' + normalizedUrl.substring(9);
        } else if (normalizedUrl.startsWith('webcals://')) {
            normalizedUrl = 'https://' + normalizedUrl.substring(10);
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(normalizedUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return res.status(400).json({ error: 'Invalid URL protocol' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // 2. SSRF Protection: Resolve hostname and check for private IP to avoid TOCTOU
        try {
            const { address } = await lookup(parsedUrl.hostname);
            if (isPrivateIp(address)) {
                console.warn(`Blocked SSRF attempt to ${url} (resolved to ${address})`);
                return res.status(403).json({ error: 'Access to internal resources is forbidden' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid hostname' });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        // Fetch using validated HTTPS/HTTP URL with proper SNI and redirect following
        const response = await fetch(parsedUrl.href, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) EduTrack/1.2 (Calendar Proxy)',
                'Accept': 'text/calendar, text/plain, */*'
            },
            redirect: 'follow',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch iCal feed from provider (status ${response.status})` });
        }

        let rawIcsData = await response.text();

        // Strip UTF-8 BOM if present
        if (rawIcsData.charCodeAt(0) === 0xFEFF) {
            rawIcsData = rawIcsData.slice(1);
        }

        // 3. Validation: Verify iCal format
        if (!rawIcsData.toUpperCase().includes('BEGIN:VCALENDAR')) {
            return res.status(400).json({ error: 'Invalid iCal feed format: missing BEGIN:VCALENDAR' });
        }

        // Strip HTML tags just in case of injection
        const sanitizedIcs = rawIcsData.replace(/<[^>]*>?/gm, '');
        
        const outputBuffer = Buffer.from(sanitizedIcs, 'utf-8');

        // Force strictly text/calendar and use CSP
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; object-src 'none';");
        res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');

        res.status(200).send(outputBuffer);
    } catch (error: any) {
        console.error('Calendar Proxy Error:', error);
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'Timeout while fetching calendar feed' });
        }
        res.status(500).json({ error: 'Internal server error while fetching calendar feed' });
    }
};
