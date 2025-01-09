import { Drawer, DrawerParagraph, DrawerTitle } from 'components/drawer'
import { WarningBox } from 'components/warningBox'
import { hemiMainnet } from 'networks/hemiMainnet'
import { mainnet } from 'networks/mainnet'
import { useTranslations } from 'next-intl'
import { Token } from 'types/token'
import { CloseIcon } from 'ui-common/components/closeIcon'
import { isEvmToken } from 'utils/token'

import { Stargate } from './stargate'

const customTunnelTokens = ['USDC', 'USDT']

export const tunnelsThroughPartner = (token: Token) =>
  customTunnelTokens.includes(token.symbol) &&
  isEvmToken(token) &&
  [hemiMainnet.id, mainnet.id].includes(token.chainId)

type Props = {
  onClose: () => void
  operation: 'deposit' | 'withdraw'
  token: Token
}

export const CustomTunnelsThroughPartner = function ({
  onClose,
  operation,
  token,
}: Props) {
  const t = useTranslations('tunnel-page.tunnel-partners')

  return (
    <Drawer onClose={onClose}>
      <div className="flex w-full flex-col gap-y-3 overflow-y-auto bg-white px-4 pb-16 pt-6 md:h-full md:w-[450px] md:max-w-md md:px-6 md:pb-6">
        <div className="flex items-center justify-between">
          <DrawerTitle>
            {t(`${operation}.heading`, { symbol: token.symbol })}
          </DrawerTitle>
          <button className="cursor-pointer" onClick={onClose}>
            <CloseIcon className="[&>path]:hover:stroke-black" />
          </button>
        </div>
        <div className="mb-3">
          <DrawerParagraph>
            {t(`${operation}.subheading`, { symbol: token.symbol })}
          </DrawerParagraph>
        </div>
        <Stargate />
        <p className="mb-3 text-sm font-medium text-zinc-500">
          {t('description')}
        </p>
        <WarningBox
          heading={t('use-at-your-own-risk')}
          subheading={t('hemi-bears-no-responsibility')}
        />
      </div>
    </Drawer>
  )
}
