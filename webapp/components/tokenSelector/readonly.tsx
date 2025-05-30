import { TokenLogo } from 'components/tokenLogo'
import { Token } from 'types/token'

type Props = {
  token: Token
}

export const TokenSelectorReadOnly = ({ token }: Props) => (
  <div className="flex items-center justify-between gap-x-2">
    <TokenLogo size="small" token={token} />
    <span className="font-medium text-neutral-950">{token.symbol}</span>
  </div>
)
