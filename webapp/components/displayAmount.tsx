import Big from 'big.js'
import { TokenLogo } from 'components/tokenLogo'
import { Tooltip } from 'components/tooltip'
import { ComponentType, Fragment, ReactNode } from 'react'
import { Token } from 'types/token'
import { formatNumber } from 'utils/format'

type CustomContainer = ComponentType<{
  children?: ReactNode
}>

const DefaultTextContainer: CustomContainer = ({ children }) => (
  <span>{children}</span>
)

type Props = {
  amount: string
  amountContainer?: CustomContainer
  container?: CustomContainer
  symbolContainer?: CustomContainer
  showSymbol?: boolean
  showTokenLogo?: boolean
  token: Token
}

export const DisplayAmount = function ({
  amountContainer: AmountContainer = DefaultTextContainer,
  container: Container = Fragment,
  amount,
  showSymbol = true,
  showTokenLogo = true,
  symbolContainer: SymbolContainer = DefaultTextContainer,
  token,
}: Props) {
  const formattedAmount = formatNumber(amount)

  const bigAmount = Big(amount)
  const notZero = !bigAmount.eq(0)
  // Only show dots for small numbers, less than the max 6 digits we're showing
  // for formatted numbers.
  const showDots = bigAmount.lt(0.000001) && notZero
  return (
    <Tooltip
      id={`amount-tooltip-${token.symbol}`}
      overlay={
        notZero ? (
          <div className="flex items-center gap-x-1 px-2 py-1 text-sm font-medium text-white">
            {showTokenLogo && <TokenLogo size="small" token={token} />}
            <span>{`${new Intl.NumberFormat('en-US', {
              maximumFractionDigits: token.decimals,
              useGrouping: true,
            }).format(
              // @ts-expect-error NumberFormat.format accept strings, typings are wrong. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format#parameters
              amount,
            )} ${token.symbol}`}</span>
          </div>
        ) : null
      }
    >
      <Container>
        <AmountContainer>{`${formattedAmount}${
          showDots ? '...' : ''
        }`}</AmountContainer>
        {showSymbol ? (
          <SymbolContainer>{` ${token.symbol}`}</SymbolContainer>
        ) : null}
      </Container>
    </Tooltip>
  )
}
