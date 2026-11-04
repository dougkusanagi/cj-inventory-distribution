import type { FocusEvent } from 'react';

export function keepFocusedInputVisible(event: FocusEvent<HTMLElement>): void {
    const target = event.target;
    const container = event.currentTarget;
    if (target instanceof HTMLInputElement) {
        requestAnimationFrame(() => {
            if (!target.isConnected || !container.isConnected) return;
            const field = target.getBoundingClientRect();
            const area = container.getBoundingClientRect();
            if (field.bottom > area.bottom) {
                container.scrollTop += field.bottom - area.bottom + 12;
            } else if (field.top < area.top) {
                container.scrollTop -= area.top - field.top + 12;
            }
        });
    }
}
