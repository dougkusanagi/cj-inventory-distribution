import { forwardRef, type SVGProps } from 'react';

type PaperBagProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
};

export const PaperBag = forwardRef<SVGSVGElement, PaperBagProps>(
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
                d="M5 8.5h14l-1 11H6l-1-11Z"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
);

PaperBag.displayName = 'PaperBag';
