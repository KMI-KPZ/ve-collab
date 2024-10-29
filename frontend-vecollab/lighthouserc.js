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
    },
};
