export const BANK_PRESETS = [
    { name: 'BoursoBank', domain: 'boursorama.com', color: '#e91e63', logo: '/logos/boursobank.png' },
    { name: 'Revolut', domain: 'revolut.com', color: '#000000', logo: '/logos/revolut.png' },
    { name: 'LCL', domain: 'lcl.fr', color: '#1A4F9C', logo: '/logos/lcl.png' },
    { name: 'BNP Paribas', domain: 'bnpparibas.com', color: '#00985f', logo: '/logos/bnp_paribas.png' },
    { name: 'Société Générale', domain: 'societegenerale.fr', color: '#e40028', logo: '/logos/societe_generale.png' },
    { name: 'Crédit Agricole', domain: 'credit-agricole.fr', color: '#008771', logo: '/logos/credit_agricole.png' },
    { name: 'Caisse d\'Épargne', domain: 'caisse-epargne.fr', color: '#ce0017', logo: '/logos/caisse_epargne.png' },
    { name: 'Banque Populaire', domain: 'banquepopulaire.fr', color: '#0055a4', logo: '/logos/banque_populaire.png' },
    { name: 'Crédit Mutuel', domain: 'creditmutuel.fr', color: '#e2001a', logo: '/logos/credit_mutuel.png' },
    { name: 'La Banque Postale', domain: 'labanquepostale.fr', color: '#163f90', logo: '/logos/la_banque_postale.png' },
    { name: 'Hello Bank!', domain: 'hellobank.fr', color: '#009fda', logo: '/logos/hello_bank.png' },
    { name: 'Fortuneo', domain: 'fortuneo.fr', color: '#2c2c2c', logo: '/logos/fortuneo.png' },
    { name: 'N26', domain: 'n26.com', color: '#36a18b', logo: '/logos/n26.png' },
    { name: 'Monabanq', domain: 'monabanq.com', color: '#4aa0cd', logo: '/logos/monabanq.png' },
    { name: 'CIC', domain: 'cic.fr', color: '#e2001a', logo: '/logos/cic.png' },
];

export const getLogoUrl = (domain: string) => {
    const preset = BANK_PRESETS.find(p => p.domain === domain);
    return preset?.logo || `https://logo.clearbit.com/${domain}`;
};
