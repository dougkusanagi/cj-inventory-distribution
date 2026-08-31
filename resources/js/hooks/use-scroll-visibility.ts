import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_THRESHOLD = 8;

export function useScrollVisibility() {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollPosition = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollPosition = Math.max(window.scrollY, 0);
            const scrollDelta =
                currentScrollPosition - lastScrollPosition.current;

            if (currentScrollPosition === 0) {
                setIsVisible(true);
            } else if (Math.abs(scrollDelta) >= SCROLL_THRESHOLD) {
                setIsVisible(scrollDelta < 0);
            }

            lastScrollPosition.current = currentScrollPosition;
        };

        lastScrollPosition.current = window.scrollY;
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const show = useCallback(() => setIsVisible(true), []);

    return { isVisible, show };
}
