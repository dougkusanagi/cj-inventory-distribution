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
