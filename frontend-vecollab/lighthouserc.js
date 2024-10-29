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
            // does not work -> 'fatal' it doesnt fail the job
            performance: ['error', { minScore: 0.7 }],
            seo: ['error', { minScore: 0.8 }],
            accessibility: ['error', { minScore: 0.9 }],
            'best-practices': ['error', { minScore: 0.9 }],
        },
    },
};
