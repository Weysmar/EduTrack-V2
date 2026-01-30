// Liste des banques françaises populaires avec leurs informations
// Utilisé pour l'autocomplete lors de la création d'une banque

export interface PopularBank {
    name: string;
    swiftBic: string;
    color: string;
    icon: string;
}

export const POPULAR_BANKS: PopularBank[] = [
    {
        name: 'Société Générale',
        swiftBic: 'SOGEFRPP',
        color: '#E60028',
        icon: '🏦'
    },
    {
        name: 'BNP Paribas',
        swiftBic: 'BNPAFRPP',
        color: '#00915A',
        icon: '🏦'
    },
    {
        name: 'Crédit Agricole',
        swiftBic: 'AGRIFRPP',
        color: '#007A3D',
        icon: '🌾'
    },
    {
        name: 'LCL',
        swiftBic: 'CRLYFRPP',
        color: '#005AA9',
        icon: '🏦'
    },
    {
        name: 'La Banque Postale',
        swiftBic: 'PSSTFRPP',
        color: '#FFCC00',
        icon: '📮'
    },
    {
        name: 'Caisse d\'Épargne',
        swiftBic: 'CEPAFRPP',
        color: '#FF0000',
        icon: '🐿️'
    },
    {
        name: 'Boursorama',
        swiftBic: 'BOUSFRPP',
        color: '#EE7203',
        icon: '💳'
    },
    {
        name: 'Crédit Mutuel',
        swiftBic: 'CMCIFRPP',
        color: '#003D7A',
        icon: '🏦'
    },
    {
        name: 'Banque Populaire',
        swiftBic: 'CCBPFRPP',
        color: '#DC143C',
        icon: '🏦'
    },
    {
        name: 'CIC',
        swiftBic: 'CMCIFRPP',
        color: '#003D7A',
        icon: '🏦'
    },
    {
        name: 'HSBC France',
        swiftBic: 'CCFRFRPP',
        color: '#DB0011',
        icon: '🏦'
    },
    {
        name: 'Revolut',
        swiftBic: 'REVOLT21',
        color: '#0075EB',
        icon: '💎'
    },
    {
        name: 'N26',
        swiftBic: 'NTSBDEB1',
        color: '#36A18B',
        icon: '🚀'
    },
    {
        name: 'Fortuneo',
        swiftBic: 'FTNOFRP1',
        color: '#FF6600',
        icon: '💳'
    },
    {
        name: 'Hello bank!',
        swiftBic: 'BNPAFRPP',
        color: '#FF7700',
        icon: '👋'
    },
    {
        name: 'Monabanq',
        swiftBic: 'CMCIFRPP',
        color: '#FF0066',
        icon: '💳'
    }
];
