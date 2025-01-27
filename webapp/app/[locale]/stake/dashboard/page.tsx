'use client'

import { featureFlags } from 'app/featureFlags'
import { PageTitle } from 'components/pageTitle'
import { useTranslations } from 'next-intl'

import {
  DiamondTag,
  HemiTag,
  PointsTag,
  SolvXpTag,
} from '../_components/rewardTag'
import { stakeTokens } from '../tokens'

import { StakeAssetsTable } from './_components/stakeAssetsTable'
import {
  EarnedPoints,
  TotalStaked,
  YourStake,
} from './_components/stakePointsCards'

const Page = function () {
  const t = useTranslations('stake-page')

  if (!featureFlags.stakeCampaignEnabled) return null

  return (
    <div className="h-fit-rest-screen w-full">
      <PageTitle
        subtitle={t('dashboard.subtitle')}
        title={t('dashboard.title')}
      />
      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        <TotalStaked />
        <YourStake />
        <EarnedPoints />
      </div>
      <div className="mt-6 md:mt-8">
        <StakeAssetsTable
          // TODO - This is a mock data, replace it with the real data
          // Related to the issue #774 - https://github.com/hemilabs/ui-monorepo/issues/774
          data={[
            {
              rewards: [<HemiTag key="hemiTag" />],
              staked: { monetaryValue: '112', quantity: '0.24' },
              token: stakeTokens.find(item => item.name === 'Merlin BTC')!,
            },
            {
              rewards: [
                <HemiTag key="hemiTag" />,
                <SolvXpTag key="solvXpTag" />,
                <PointsTag key="pointsTag" />,
              ],
              staked: { monetaryValue: '105', quantity: '0.50' },
              token: stakeTokens.find(item => item.name === 'pumpBTC')!,
            },
            {
              rewards: [
                <HemiTag key="hemiTag" />,
                <DiamondTag key="diamondTag" />,
              ],
              staked: { monetaryValue: '220', quantity: '1.25' },
              token: stakeTokens.find(
                item => item.name === 'Lorenzo Wrapped Bitcoin',
              )!,
            },
          ]}
          loading={false}
        />
      </div>
    </div>
  )
}

export default Page
