import { useState } from 'react';
import {
    ShoppingCart, Home, Zap, Coffee, Car, Heart, Plane,
    Wifi, Utensils, GraduationCap, Briefcase, DollarSign,
    ArrowLeftRight, HelpCircle
} from 'lucide-react';

interface Props {
    description: string;
    classification?: string;
    size?: number;
}

// Mapping libellé → domaine Clearbit
const MERCHANT_DOMAINS: Record<string, string> = {
    'amazon': 'amazon.fr',
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'apple': 'apple.com',
    'google': 'google.com',
    'microsoft': 'microsoft.com',
    'paypal': 'paypal.com',
    'carrefour': 'carrefour.fr',
    'leclerc': 'e.leclerc',
    'lidl': 'lidl.fr',
    'aldi': 'aldi.fr',
    'intermarche': 'intermarche.com',
    'monoprix': 'monoprix.fr',
    'franprix': 'franprix.fr',
    'sncf': 'sncf.com',
    'ratp': 'ratp.fr',
    'uber': 'uber.com',
    'blablacar': 'blablacar.fr',
    'edf': 'edf.fr',
    'engie': 'engie.fr',
    'orange': 'orange.fr',
    'sfr': 'sfr.fr',
    'bouygues': 'bouyguestelecom.fr',
    'free': 'free.fr',
    'darty': 'darty.com',
    'fnac': 'fnac.com',
    'ikea': 'ikea.com',
    'decathlon': 'decathlon.fr',
    'zara': 'zara.com',
    'h&m': 'hm.com',
    'hm': 'hm.com',
    'primark': 'primark.com',
    'mcdonalds': 'mcdonalds.fr',
    'mcdonald': 'mcdonalds.fr',
    'burger king': 'burgerking.fr',
    'starbucks': 'starbucks.fr',
    'deliveroo': 'deliveroo.fr',
    'uber eats': 'ubereats.com',
    'just eat': 'just-eat.fr',
    'airbnb': 'airbnb.fr',
    'booking': 'booking.com',
    'axa': 'axa.fr',
    'maif': 'maif.fr',
    'ameli': 'ameli.fr',
    'doctolib': 'doctolib.fr',
    'leetchi': 'leetchi.com',
    'lydia': 'lydia-app.com',
    'payfit': 'payfit.com',
    'alan': 'alan.com',
};

// Fallback icon based on classification
function ClassificationIcon({ classification, size }: { classification?: string; size: number }) {
    const cls = `w-${size <= 32 ? 4 : 5} h-${size <= 32 ? 4 : 5}`;
    if (!classification) return <HelpCircle className={`${cls} text-slate-500`} />;
    if (classification.startsWith('INTERNAL')) return <ArrowLeftRight className={`${cls} text-purple-400`} />;
    if (classification === 'EXTERNAL') return <DollarSign className={`${cls} text-blue-400`} />;
    return <HelpCircle className={`${cls} text-slate-500`} />;
}

function extractDomain(description: string): string | null {
    const lower = description.toLowerCase();
    for (const [keyword, domain] of Object.entries(MERCHANT_DOMAINS)) {
        if (lower.includes(keyword)) return domain;
    }
    return null;
}

export function MerchantLogo({ description, classification, size = 32 }: Props) {
    const [imgError, setImgError] = useState(false);
    const domain = extractDomain(description);

    const containerClass = `flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 shrink-0 overflow-hidden`;
    const containerStyle = { width: size, height: size };

    if (domain && !imgError) {
        return (
            <div className={containerClass} style={containerStyle}>
                <img
                    src={`https://logo.clearbit.com/${domain}`}
                    alt={domain}
                    width={size - 8}
                    height={size - 8}
                    className="object-contain rounded-full"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    return (
        <div className={containerClass} style={containerStyle}>
            <ClassificationIcon classification={classification} size={size} />
        </div>
    );
}
