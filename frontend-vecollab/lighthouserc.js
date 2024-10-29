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
            performance: ['error', { minScore: 0.99 }],
            seo: ['error', { minScore: 0.99 }],
            accessibility: ['error', { minScore: 0.99 }],
            'best-practices': ['error', { minScore: 0.99 }],
        },
    },
};
