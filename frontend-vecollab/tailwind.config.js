/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',

        // Or if using `src` directory:
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                orange: '#c4560b',
                blue: '#00748f',
            },
            backgroundImage: {
                'footer-pattern': "url('/images/footer/KAVAQ_Footer.png')",
                'pattern-left-blue':
                    "url('/images/logoPattern/vecollab_KAVAQ_pattern_left_blue.png')",
                'pattern-left-blue-small':
                    "url('/images/logoPattern/vecollab_pattern_left_blue_small.png')",
                'pattern-right-grey': "url('/images/logoPattern/vecollab_pattern_grey.png')",
                'pattern-bottom-left-blue':
                    "url('/images/logoPattern/vecollab_pattern_bottom_left_blue.png')",
                'pattern-bottom-left-orange':
                    "url('/images/logoPattern/vecollab_pattern_left_orange.png')",
            },
            fontFamily: {
                konnect: ['Konnect'],
            },
        },
    },
    plugins: [],
};
