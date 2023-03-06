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
            },
        },
    },
    plugins: [],
};
