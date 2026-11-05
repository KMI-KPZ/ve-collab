import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    children: ReactNode;
}

/**
 * render children at the end of <body> instead of inside the current DOM
 * position. Needed for modals/overlays that live inside an element with a
 * CSS `filter` or `transform` (e.g. WhiteBox's drop-shadow): such elements
 * become the containing block of `position: fixed` descendants, which would
 * confine the overlay to that element instead of the viewport.
 *
 * The wrapper creates a stacking context above the page header (z-50), so
 * the overlays inside cover the whole screen including the navigation.
 */
export default function Portal({ children }: Props) {
    const [mounted, setMounted] = useState(false);

    // document is not available during SSR
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(<div className="relative z-[60]">{children}</div>, document.body);
}
