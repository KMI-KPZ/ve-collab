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
                've-collab-orange': '#c4560b',
                've-collab-orange-light': '#f7a670',
                've-collab-blue': '#00748f',
                've-collab-blue-light': '#d8f2f9',
            },
            fontSize: {
                '5xl': '2.5rem',
                '6xl': '2.75rem',
                '7xl': '4.5rem',
                '8xl': '6.25rem',
            },
            backgroundImage: {
                'footer-pattern': "url('/images/footer/KAVAQ_Footer.png')",
                'footer-pattern-rounded': "url('/images/footer/KAVAQ_Footer_rounded.png')",
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
            boxShadow: {
                roundBox: '0px 6px 18px 12px rgba(0, 0, 0, 0.3)',
                'button-primary': 'inset 0 -5px 0 rgba(146, 45, 10, 1)',
                'button-blue-light': 'inset 0 -5px 0 rgba(0, 116, 143, 1)'
            },
        },
    },
    plugins: [],
};
