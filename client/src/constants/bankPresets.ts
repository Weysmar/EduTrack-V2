export const BANK_PRESETS = [
    { name: 'BoursoBank', domain: 'oursorama.com', color: '#e91e63' }, // Pinkish
    { name: 'Revolut', domain: 'revolut.com', color: '#000000' },     // Black
    { name: 'LCL', domain: 'lcl.fr', color: '#1A4F9C' },              // Blue
    { name: 'BNP Paribas', domain: 'mabanque.bnpparibas', color: '#00985f' }, // Green
    { name: 'Société Générale', domain: 'societegenerale.fr', color: '#e40028' }, // Red/Black
    { name: 'Crédit Agricole', domain: 'credit-agricole.fr', color: '#008771' }, // Green/Teal
    { name: 'Caisse d\'Épargne', domain: 'caisse-epargne.fr', color: '#ce0017' }, // Red
    { name: 'Banque Populaire', domain: 'banquepopulaire.fr', color: '#0055a4' }, // Blue
    { name: 'Crédit Mutuel', domain: 'creditmutuel.fr', color: '#e2001a' },   // Red
    { name: 'La Banque Postale', domain: 'labanquepostale.fr', color: '#163f90' }, // Blue/Yellow
    { name: 'Hello Bank!', domain: 'hellobank.fr', color: '#009fda' }, // Light Blue
    { name: 'Fortuneo', domain: 'fortuneo.fr', color: '#2c2c2c' },    // Dark
    { name: 'N26', domain: 'n26.com', color: '#36a18b' },             // Teal
    { name: 'Monabanq', domain: 'monabanq.com', color: '#4aa0cd' },   // Blue
    { name: 'CIC', domain: 'cic.fr', color: '#e2001a' },              // Red
];

export const getLogoUrl = (domain: string) => `https://logo.clearbit.com/${domain}`;
