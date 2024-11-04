module.exports = {
    ci: {
        collect: {
            url: ['http://localhost:3000/de'],
            startServerCommand: 'npm run start',
            settings: {
                preset: 'desktop',
            },
            numberOfRuns: 2,
        },
        upload: {
            target: 'temporary-public-storage',
        },
        // for advanced comparison: Lighthouse team's recommended set of audits
        /*assert: {
            preset: 'lighthouse:recommended',
        },*/
    },
};
