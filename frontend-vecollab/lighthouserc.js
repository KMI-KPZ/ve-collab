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
        assertions: {
            performance: ['fatal', { minScore: 0.99 }],
            seo: ['fatal', { minScore: 0.99 }],
            accessibility: ['fatal', { minScore: 0.99 }],
            'best-practices': ['fatal', { minScore: 0.99 }],
        },
    },
};
