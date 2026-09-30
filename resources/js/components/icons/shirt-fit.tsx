import { forwardRef, type SVGProps } from 'react';

type ShirtFitProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
};

function createShirtFitIcon(path: string, displayName: string) {
    const Icon = forwardRef<SVGSVGElement, ShirtFitProps>(
        ({ size = 24, strokeWidth = 1.75, ...props }, ref) => (
            <svg
                ref={ref}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                {...props}
            >
                <path
                    d={path}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        ),
    );

    Icon.displayName = displayName;

    return Icon;
}

export const SlimShirt = createShirtFitIcon(
    'M10.25 3.5Q12 5.75 13.75 3.5L16.5 4.6L18.75 8.75L16 9.9V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9.9L5.25 8.75L7.5 4.6Z',
    'SlimShirt',
);

export const PlusShirt = createShirtFitIcon(
    'M9.5 3.5Q12 6.25 14.5 3.5L19 4.75L22.5 9.5L20 10.9V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10.9L1.5 9.5L5 4.75Z',
    'PlusShirt',
);

const slimTee = {
    body: 'M9.5 3.1 6.4 4.2 3.8 8.5l3.4 1.8c-.1 2.9.3 5.4.6 9.2a1.4 1.4 0 0 0 1.4 1.4h5.6a1.4 1.4 0 0 0 1.4-1.4c.3-3.8.7-6.3.6-9.2l3.4-1.8-2.6-4.3-3.1-1.1a3.1 3.1 0 0 1-5 0Z',
    hem: 'M9.4 18.2h5.2',
};

const plusTee = {
    body: 'M9.2 3 4.6 4.1 1.2 9.2l3.4 2.1v8.5A1.4 1.4 0 0 0 6 21.2h12a1.4 1.4 0 0 0 1.4-1.4v-8.5l3.4-2.1-3.4-5.1L14.8 3a3.4 3.4 0 0 1-5.6 0Z',
    hem: 'M6.8 18.2h10.4',
};

/** Camisa slim dentro da silhueta plus, alinhada ao centro e à barra. */
const slimInsidePlusScale = 0.78;
const slimInsidePlusTransform = `translate(2.64 4.6) scale(${slimInsidePlusScale})`;

function createTeeIcon(
    shape: { body: string; hem: string },
    displayName: string,
) {
    const Icon = forwardRef<SVGSVGElement, ShirtFitProps>(
        ({ size = 24, strokeWidth = 1.75, ...props }, ref) => (
            <svg
                ref={ref}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                {...props}
            >
                <path d={shape.body} fill="currentColor" fillOpacity={0.16} />
                <path d={shape.hem} strokeOpacity={0.6} />
            </svg>
        ),
    );

    Icon.displayName = displayName;

    return Icon;
}

/** Versões com preenchimento suave e barra; `SlimShirt` e `PlusShirt` acima seguem disponíveis. */
export const SlimTee = createTeeIcon(slimTee, 'SlimTee');

export const PlusTee = createTeeIcon(plusTee, 'PlusTee');

/** Representa "Slim e Plus": a silhueta plus preenchida ao fundo e a slim contornada à frente. */
export const SlimPlusTee = forwardRef<SVGSVGElement, ShirtFitProps>(
    ({ size = 24, strokeWidth = 1.75, ...props }, ref) => (
        <svg
            ref={ref}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            {...props}
        >
            <path
                d={plusTee.body}
                fill="currentColor"
                fillOpacity={0.22}
                stroke="none"
            />
            <path
                d={slimTee.body}
                fill="currentColor"
                fillOpacity={0.35}
                strokeWidth={(Number(strokeWidth) * 0.9) / slimInsidePlusScale}
                transform={slimInsidePlusTransform}
            />
        </svg>
    ),
);

SlimPlusTee.displayName = 'SlimPlusTee';
