let reqDebounce: ReturnType<typeof setTimeout> | undefined = undefined;

const requestDebounce = (callback: Function, delay = 300) => {
    if (reqDebounce) clearTimeout(reqDebounce);
    reqDebounce = setTimeout(() => {
        callback();
    }, delay);
};

export default requestDebounce;
