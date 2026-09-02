import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_THRESHOLD = 8;

type ScrollVisibilityOptions = {
    showAtDocumentEnd?: boolean;
};

export function useScrollVisibility({
    showAtDocumentEnd = false,
}: ScrollVisibilityOptions = {}) {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollPosition = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollPosition = Math.max(window.scrollY, 0);
            const scrollDelta =
                currentScrollPosition - lastScrollPosition.current;
            const isAtDocumentEnd =
                window.innerHeight + currentScrollPosition >=
                document.documentElement.scrollHeight - SCROLL_THRESHOLD;

            if (
                currentScrollPosition === 0 ||
                (showAtDocumentEnd && isAtDocumentEnd)
            ) {
                setIsVisible(true);
            } else if (Math.abs(scrollDelta) >= SCROLL_THRESHOLD) {
                setIsVisible(scrollDelta < 0);
            }

            lastScrollPosition.current = currentScrollPosition;
        };

        lastScrollPosition.current = window.scrollY;
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, [showAtDocumentEnd]);

    const show = useCallback(() => setIsVisible(true), []);

    return { isVisible, show };
}
