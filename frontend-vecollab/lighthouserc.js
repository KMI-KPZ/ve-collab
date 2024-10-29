module.exports = {
    ci: {
        collect: {
            url: ['http://localhost:3000/de'],
            startServerCommand: 'npm run start',
            settings: {
                preset: 'desktop',
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
};
