import { waitForTransactionReceipt } from '@wagmi/core'
import { hemi, hemiSepolia } from 'hemi-viem'
import { stakeManagerAddresses } from 'hemi-viem-stake-actions'
import { HemiPublicClient, HemiWalletClient } from 'hooks/useHemiClient'
import { EvmToken } from 'types/token'
import { canSubmit, stake, unstake } from 'utils/stake'
import {
  approveErc20Token,
  getErc20TokenAllowance,
  getErc20TokenBalance,
} from 'utils/token'
import { Hash, parseUnits, zeroAddress } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@wagmi/core', () => ({
  waitForTransactionReceipt: vi.fn(),
}))

vi.mock('utils/nativeToken', () => ({
  isNativeToken: vi.fn(token => token.symbol === 'ETH'),
}))

vi.mock('utils/token', () => ({
  approveErc20Token: vi.fn(),
  getErc20TokenAllowance: vi.fn(),
  getErc20TokenBalance: vi.fn(),
}))

// @ts-expect-error Adding minimal properties needed
const token: EvmToken = {
  address: '0x0000000000000000000000000000000000000006',
  chainId: hemiSepolia.id,
  decimals: 18,
  symbol: 'fakeToken',
}

// fake transaction hash generated by an approval operation
const approvalTransactionHash =
  '0x0000000000000000000000000000000000000000000000000000000000000456' satisfies Hash
// fake transaction hash generated by a stake operation
const stakeTransactionHash =
  '0x0000000000000000000000000000000000000000000000000000000000000123' satisfies Hash
// fake transaction hash generated by an unstake operation
const unstakeTransactionHash =
  '0x0000000000000000000000000000000000000000000000000000000000000789' satisfies Hash

// @ts-expect-error only add the minimum values required
const hemiPublicClient: HemiPublicClient = {
  chain: hemiSepolia,
  stakedBalance: vi.fn(),
}
// @ts-expect-error only add the minimum values required
const hemiWalletClient: HemiWalletClient = {
  stakeERC20Token: vi.fn(),
  stakeETHToken: vi.fn(),
  unstakeToken: vi.fn(),
}

describe('utils/stake', function () {
  describe('canSubmit', function () {
    it('should return error if amount is a negative value', function () {
      const result = canSubmit({
        amount: BigInt(-123),
        balance: BigInt(1000),
        connectedChainId: hemiSepolia.id,
        token,
      })
      expect(result).toEqual({ error: 'amount-less-equal-than-0' })
    })

    it('should return error if amount is equal to 0', function () {
      const result = canSubmit({
        amount: BigInt(0),
        balance: BigInt(1000),
        connectedChainId: hemiSepolia.id,
        token,
      })
      expect(result).toEqual({ error: 'amount-less-equal-than-0' })
    })

    it('should return error if chain ID does not match', function () {
      const result = canSubmit({
        amount: BigInt(1),
        balance: BigInt(1000),
        connectedChainId: hemi.id,
        token,
      })
      expect(result).toEqual({ error: 'wrong-chain' })
    })

    it('should return error if balance is less than or equal to 0', function () {
      const result = canSubmit({
        amount: BigInt(1),
        balance: BigInt(0),
        connectedChainId: hemiSepolia.id,
        token,
      })
      expect(result).toEqual({ error: 'not-enough-balance' })
    })

    it('should return error if balance is less than the amount', function () {
      const result = canSubmit({
        amount: BigInt(10),
        balance: BigInt(9),
        connectedChainId: hemiSepolia.id,
        token,
      })
      expect(result).toEqual({ error: 'amount-larger-than-balance' })
    })

    it('should return empty object if all conditions are met', function () {
      const result = canSubmit({
        amount: BigInt(1),
        balance: BigInt(1000),
        connectedChainId: hemiSepolia.id,
        token,
      })
      expect(result).toEqual({})
    })
  })

  describe('stake', function () {
    beforeEach(function () {
      vi.clearAllMocks()
    })

    it('should throw error if the user has not enough balance', async function () {
      getErc20TokenAllowance.mockResolvedValue(BigInt(0))
      getErc20TokenBalance.mockResolvedValue(BigInt(0))

      const amount = parseUnits('1', token.decimals)

      await expect(
        stake({
          amount,
          forAccount: zeroAddress,
          hemiPublicClient,
          hemiWalletClient,
          token,
        }),
      ).rejects.toThrow('not-enough-balance')
    })

    it('should call stakeERC20Token if the token has enough allowance', async function () {
      // the user has enough balance
      getErc20TokenAllowance.mockResolvedValue(parseUnits('1', token.decimals))
      // the token has enough allowance
      getErc20TokenBalance.mockResolvedValue(parseUnits('1', token.decimals))
      // fake transaction hash generated by staking
      hemiWalletClient.stakeERC20Token.mockResolvedValue(stakeTransactionHash)
      // fake waiting for receipt
      waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

      const amount = parseUnits('1', token.decimals)

      const onStake = vi.fn()
      const onStakeConfirmed = vi.fn()
      const onStakeFailed = vi.fn()
      const onStakeTokenApprovalFailed = vi.fn()
      const onStakeTokenApproved = vi.fn()
      const onTokenApprove = vi.fn()
      const onUserRejectedStake = vi.fn()
      const onUserRejectedTokenApproval = vi.fn()
      const onUserSignedStake = vi.fn()
      const onUserSignedTokenApproval = vi.fn()

      await stake({
        amount,
        forAccount: zeroAddress,
        hemiPublicClient,
        hemiWalletClient,
        onStake,
        onStakeConfirmed,
        onStakeFailed,
        onStakeTokenApprovalFailed,
        onStakeTokenApproved,
        onTokenApprove,
        onUserRejectedStake,
        onUserRejectedTokenApproval,
        onUserSignedStake,
        onUserSignedTokenApproval,
        token,
      })

      // assert event functions
      expect(onStake).toHaveBeenCalledOnce()
      expect(onStakeConfirmed).toHaveBeenCalledOnce()
      expect(onStakeFailed).not.toHaveBeenCalled()
      expect(onStakeTokenApprovalFailed).not.toHaveBeenCalled()
      expect(onStakeTokenApproved).not.toHaveBeenCalled()
      expect(onTokenApprove).not.toHaveBeenCalled()
      expect(onUserRejectedStake).not.toHaveBeenCalled()
      expect(onUserRejectedTokenApproval).not.toHaveBeenCalled()
      expect(onUserSignedStake).toHaveBeenCalledWith(stakeTransactionHash)
      expect(onUserSignedTokenApproval).not.toHaveBeenCalled()

      // assert event call
      expect(hemiWalletClient.stakeERC20Token).toHaveBeenCalledWith({
        amount,
        forAccount: zeroAddress,
        tokenAddress: token.address,
      })
    })

    it('should first approve and then call stakeERC20Token if the token does not have enough allowance', async function () {
      // the user has enough balance
      getErc20TokenBalance.mockResolvedValue(parseUnits('1', token.decimals))
      // the token does not have enough allowance
      getErc20TokenAllowance.mockResolvedValue(BigInt(0))
      // fake transaction hashes generation
      approveErc20Token.mockResolvedValue(approvalTransactionHash)
      hemiWalletClient.stakeERC20Token.mockResolvedValue(stakeTransactionHash)
      // fake waiting for approval receipt
      waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' })
      // fake waiting for stake receipt
      waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' })

      const amount = parseUnits('1', token.decimals)

      const onStake = vi.fn()
      const onStakeConfirmed = vi.fn()
      const onStakeFailed = vi.fn()
      const onStakeTokenApprovalFailed = vi.fn()
      const onStakeTokenApproved = vi.fn()
      const onTokenApprove = vi.fn()
      const onUserRejectedStake = vi.fn()
      const onUserRejectedTokenApproval = vi.fn()
      const onUserSignedStake = vi.fn()
      const onUserSignedTokenApproval = vi.fn()

      await stake({
        amount,
        forAccount: zeroAddress,
        hemiPublicClient,
        hemiWalletClient,
        onStake,
        onStakeConfirmed,
        onStakeFailed,
        onStakeTokenApprovalFailed,
        onStakeTokenApproved,
        onTokenApprove,
        onUserRejectedStake,
        onUserRejectedTokenApproval,
        onUserSignedStake,
        onUserSignedTokenApproval,
        token,
      })

      // assert event functions
      expect(onStake).toHaveBeenCalledOnce()
      expect(onUserRejectedTokenApproval).not.toHaveBeenCalled()
      expect(onStakeTokenApprovalFailed).not.toHaveBeenCalled()
      expect(onUserSignedTokenApproval).toHaveBeenCalledWith(
        approvalTransactionHash,
      )
      expect(onStakeTokenApproved).toHaveBeenCalledOnce()
      expect(onTokenApprove).toHaveBeenCalledOnce()
      expect(onUserRejectedStake).not.toHaveBeenCalled()
      expect(onStakeFailed).not.toHaveBeenCalled()
      expect(onUserSignedStake).toHaveBeenCalledWith(stakeTransactionHash)
      expect(onStakeConfirmed).toHaveBeenCalledOnce()

      expect(approveErc20Token).toHaveBeenCalledWith({
        address: token.address,
        amount,
        client: hemiWalletClient,
        spender: stakeManagerAddresses[token.chainId],
      })
      expect(hemiWalletClient.stakeERC20Token).toHaveBeenCalledWith({
        amount,
        forAccount: zeroAddress,
        tokenAddress: token.address,
      })
    })
  })

  describe('unstake', function () {
    beforeEach(function () {
      vi.clearAllMocks()
    })

    it('should throw error if the user has not enough staked balance', async function () {
      hemiPublicClient.stakedBalance.mockResolvedValue(BigInt(0))

      const amount = parseUnits('1', token.decimals)

      await expect(
        unstake({
          amount,
          forAccount: zeroAddress,
          hemiPublicClient,
          hemiWalletClient,
          token,
        }),
      ).rejects.toThrow('not-enough-balance')
    })

    it('should call unstakeToken if the user has enough staked balance', async function () {
      const amount = parseUnits('1', token.decimals)
      // the user has enough staked balance
      hemiPublicClient.stakedBalance.mockResolvedValue(amount)
      // fake transaction hash generated by unstaking
      hemiWalletClient.unstakeToken.mockResolvedValue(unstakeTransactionHash)
      // fake waiting for receipt
      waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

      const onUnstake = vi.fn()
      const onUnstakeConfirmed = vi.fn()
      const onUnstakeFailed = vi.fn()
      const onUserRejectedUnstake = vi.fn()
      const onUserSignedUnstake = vi.fn()

      await unstake({
        amount,
        forAccount: zeroAddress,
        hemiPublicClient,
        hemiWalletClient,
        onUnstake,
        onUnstakeConfirmed,
        onUnstakeFailed,
        onUserRejectedUnstake,
        onUserSignedUnstake,
        token,
      })

      // assert event functions
      expect(onUnstake).toHaveBeenCalledOnce()
      expect(onUserRejectedUnstake).not.toHaveBeenCalled()
      expect(onUnstakeFailed).not.toHaveBeenCalled()
      expect(onUserSignedUnstake).toHaveBeenCalledWith(unstakeTransactionHash)
      expect(onUnstakeConfirmed).toHaveBeenCalledOnce()

      // assert event call
      expect(hemiWalletClient.unstakeToken).toHaveBeenCalledWith({
        amount,
        forAccount: zeroAddress,
        tokenAddress: token.address,
      })
    })
  })
})
