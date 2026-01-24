export const BANK_PRESETS = [
    { name: 'BoursoBank', domain: 'boursorama.com', color: '#e91e63', logo: '/logos/boursobank.svg' },
    { name: 'Revolut', domain: 'revolut.com', color: '#000000', logo: '/logos/revolut.svg' },
    { name: 'LCL', domain: 'lcl.fr', color: '#1A4F9C', logo: '/logos/lcl.svg' },
    { name: 'BNP Paribas', domain: 'bnpparibas.com', color: '#00985f', logo: '/logos/bnp_paribas.svg' },
    { name: 'Société Générale', domain: 'societegenerale.fr', color: '#e40028', logo: '/logos/societe_generale.svg' },
    { name: 'Crédit Agricole', domain: 'credit-agricole.fr', color: '#008771', logo: '/logos/credit_agricole.svg' },
    { name: 'Caisse d\'Épargne', domain: 'caisse-epargne.fr', color: '#ce0017', logo: '/logos/caisse_epargne.svg' },
    { name: 'Banque Populaire', domain: 'banquepopulaire.fr', color: '#0055a4', logo: '/logos/banque_populaire.svg' },
    { name: 'Crédit Mutuel', domain: 'creditmutuel.fr', color: '#e2001a', logo: '/logos/credit_mutuel.svg' },
    { name: 'La Banque Postale', domain: 'labanquepostale.fr', color: '#163f90', logo: '/logos/la_banque_postale.svg' },
    { name: 'Hello Bank!', domain: 'hellobank.fr', color: '#009fda', logo: '/logos/hello_bank.svg' },
    { name: 'Fortuneo', domain: 'fortuneo.fr', color: '#2c2c2c', logo: '/logos/fortuneo.svg' },
    { name: 'N26', domain: 'n26.com', color: '#36a18b', logo: '/logos/n26.svg' },
    { name: 'Monabanq', domain: 'monabanq.com', color: '#4aa0cd', logo: '/logos/monabanq.svg' },
    { name: 'CIC', domain: 'cic.fr', color: '#e2001a', logo: '/logos/cic.svg' },
];

export const getLogoUrl = (domain: string) => {
    const preset = BANK_PRESETS.find(p => p.domain === domain);
    return preset?.logo || null;
};
