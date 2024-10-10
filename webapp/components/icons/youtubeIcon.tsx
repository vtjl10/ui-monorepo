import { ComponentProps } from 'react'

export const YoutubeIcon = (props: ComponentProps<'svg'>) => (
  <svg
    fill="none"
    height={20}
    width={20}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M19.582 5.155a2.513 2.513 0 0 0-1.769-1.78c-1.559-.42-7.813-.42-7.813-.42s-6.254 0-7.814.42a2.514 2.514 0 0 0-1.768 1.78C0 6.725 0 10 0 10s0 3.275.418 4.845a2.514 2.514 0 0 0 1.769 1.78c1.559.42 7.813.42 7.813.42s6.254 0 7.814-.42a2.512 2.512 0 0 0 1.768-1.78C20 13.275 20 10 20 10s0-3.275-.418-4.845ZM7.954 12.973V7.027L13.182 10l-5.228 2.973Z"
      fill="#737373"
    />
  </svg>
)
