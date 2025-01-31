import Big from 'big.js'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'
import Skeleton from 'react-loading-skeleton'
import { Token } from 'types/token'

const Balance = dynamic(
  () => import('components/balance').then(mod => mod.Balance),
  {
    loading: () => (
      <Skeleton className="h-full" containerClassName="basis-1/3" />
    ),
    ssr: false,
  },
)

type Props = {
  disabled: boolean
  label: string
  maxBalanceButton?: ReactNode
  minInputMsg?: string
  onChange: (value: string) => void
  token: Token
  tokenSelector: ReactNode
  value: string
}

export const TokenInput = function ({
  disabled,
  label,
  maxBalanceButton,
  minInputMsg,
  onChange,
  token,
  tokenSelector,
  value,
}: Props) {
  const t = useTranslations('tunnel-page')
  return (
    <div
      className="h-[120px] rounded-lg border border-solid border-transparent bg-neutral-50
      p-4 font-medium text-neutral-500 hover:border-neutral-300/55"
    >
      <div className="flex h-full items-center justify-between">
        <div className="flex h-full flex-shrink flex-grow flex-col items-start">
          <span className="text-sm">{label}</span>
          <input
            className={`
            text-3.25xl max-w-1/2 w-full bg-transparent ${
              Big(value).gt(0) ? 'text-neutral-950' : 'text-neutral-600'
            }
            outline-none focus:text-neutral-950`}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            type="text"
            value={value}
          />
          {!!minInputMsg && (
            <span className="mt-auto text-sm font-medium text-neutral-500">
              {minInputMsg}
            </span>
          )}
        </div>
        <div className="flex h-full flex-col items-end justify-end gap-y-3 text-sm">
          {tokenSelector}
          <div className="flex items-center justify-end gap-x-2 text-sm">
            <span className="text-neutral-500">{t('form.balance')}:</span>
            <span className="text-neutral-950">
              <Balance token={token} />
            </span>
            {maxBalanceButton}
          </div>
        </div>
      </div>
    </div>
  )
}
