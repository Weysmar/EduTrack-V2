/** Tests unitaires du serveur (lancés aussi pendant le build Docker : un test en échec bloque le déploiement) */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    clearMocks: true,
};
