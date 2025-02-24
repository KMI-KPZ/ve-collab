import React, { useEffect, useRef } from 'react';

const PLACEHOLDER_UPDATE_INTERVAL = 3000;
const CHARACTER_WRITE_DELAY = 50;

const useDynamicPlaceholder = (searchInputRef: React.RefObject<HTMLInputElement>) => {
    const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!searchInputRef?.current?.dataset?.placeholder) return;

        const placeholders = searchInputRef.current.dataset.placeholder.split(';');
        if (placeholders.length === 0) return;

        let i = 0;
        searchInputRef.current.placeholder = placeholders[i];

        const updatePlaceholder = () => {
            i = (i + 1) % placeholders.length;
            let j = 0;

            const writePlaceholder = () => {
                j++;
                if (j > placeholders[i].length) return;
                if (searchInputRef?.current == undefined) return;

                searchInputRef!.current!.placeholder = placeholders[i].slice(0, j);
                timeoutId.current = setTimeout(writePlaceholder, CHARACTER_WRITE_DELAY);
            };

            writePlaceholder();
        };

        intervalId.current = setInterval(updatePlaceholder, PLACEHOLDER_UPDATE_INTERVAL);

        return () => {
            clearInterval(intervalId.current || 0);
            clearTimeout(timeoutId.current || 0);
        };
    }, [searchInputRef]);
};

export default useDynamicPlaceholder;
