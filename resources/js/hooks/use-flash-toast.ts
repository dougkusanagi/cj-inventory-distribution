import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            const action = data.action;
            toast[data.type](data.message, {
                // Com ação, o aviso fica mais tempo para dar tempo de usá-la.
                duration: action ? 10000 : undefined,
                action: action
                    ? {
                          label: action.label,
                          onClick: () =>
                              router.post(action.url, action.data, {
                                  preserveScroll: true,
                                  preserveState: true,
                              }),
                      }
                    : undefined,
            });
        });
    }, []);
}
