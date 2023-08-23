import { Signer } from 'ethers'
import { UserOperation } from '@biconomy-devx/core-types'
import { Bytes } from 'ethers/lib/utils'

export interface IValidationModule {
  getAddress(): string
  getInitData(): Promise<string>
  getSigner(): Promise<Signer>
  signUserOp(userOp: UserOperation): Promise<string>
  signMessage(message: Bytes | string): Promise<string>
  getDummySignature(): string
}
