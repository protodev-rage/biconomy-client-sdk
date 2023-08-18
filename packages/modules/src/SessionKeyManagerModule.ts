import { Signer, ethers } from 'ethers'
import MerkleTree from 'merkletreejs'
import { Logger, getUserOpHash, NODE_CLIENT_URL } from '@biconomy/common'
import { EntryPoint, EntryPoint__factory } from '@account-abstraction/contracts'
import {
  Bytes,
  BytesLike,
  hexConcat,
  arrayify,
  keccak256,
  hexZeroPad,
  hexlify
} from 'ethers/lib/utils'
import {
  BaseValidationModuleConfig,
  SessionKeyManagerModuleConfig,
  ModuleVersion
} from './utils/Types'
import { UserOperation, ChainId } from '@biconomy/core-types'
import NodeClient from '@biconomy/node-client'
import INodeClient from '@biconomy/node-client'
import { SESSION_MANAGER_MODULE_ADDRESSES_BY_VERSION } from './utils/Constants'
import { BaseValidationModule } from './BaseValidationModule'

// Could be renamed with suffix API
export class SessionKeyManagerModule extends BaseValidationModule {
  // Review
  sessionSigner!: Signer // optional global signer
  sessionPubKey?: string // optional global public key
  chainId: ChainId
  moduleAddress!: string
  version: ModuleVersion = 'V1_0_0'
  nodeClient!: INodeClient
  merkleTree!: MerkleTree
  // entryPoint!: EntryPoint

  constructor(moduleConfig: SessionKeyManagerModuleConfig) {
    super(moduleConfig)
    if (moduleConfig.moduleAddress) {
      this.moduleAddress = moduleConfig.moduleAddress
    } else if (moduleConfig.version) {
      const moduleAddr = SESSION_MANAGER_MODULE_ADDRESSES_BY_VERSION[moduleConfig.version]
      if (!moduleAddr) {
        throw new Error(`Invalid version ${moduleConfig.version}`)
      }
      this.moduleAddress = moduleAddr
      this.version = moduleConfig.version as ModuleVersion
    }
    this.sessionSigner = moduleConfig.sessionSigner ?? ethers.Wallet.createRandom()
    this.sessionPubKey = moduleConfig.sessionPubKey
    this.chainId = moduleConfig.chainId
    // this.entryPoint = ... // May not be needed at all
    this.nodeClient = new NodeClient({
      txServiceUrl: moduleConfig.nodeClientUrl ?? NODE_CLIENT_URL
    })
    this.merkleTree = new MerkleTree([hexZeroPad('0x00', 32)], keccak256, { hashLeaves: false })
  }

  // init() ?

  // Session Key Manager Module Address
  getAddress(): string {
    return this.moduleAddress
  }

  async getSigner(): Promise<Signer> {
    throw new Error('Method not implemented.')
  }

  // TODO // check with Fillip
  getDummySignature(): string {
    return '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000d9cf3caaa21db25f16ad6db43eb9932ab77c8e76000000000000000000000000000000000000000000000000000000000000004181d4b4981670cb18f99f0b4a66446df1bf5b204d24cfcb659bf38ba27a4359b5711649ec2423c5e1247245eba2964679b6a1dbb85c992ae40b9b00c6935b02ff1b00000000000000000000000000000000000000000000000000000000000000'
  }

  // Note: other modules may need additional attributes to build init data
  async getInitData(): Promise<string> {
    throw new Error('Method not implemented.')
  }

  /* createSessionData(sessionInfo: CreateSessionDto): Promise<Transaction> {

     validUntil: number
     validAfter: number
     sessionValidationModuleAddress: string
     // sessionPublicKey: string
     sessionKeyData: string

     // access current merkle tree (all leaves)
     // add new leaf
     // recalculate merkle root

     // add leaf in storage with pending status

     // create tx : to(session manager module address, value=0, data setMerkleRoot(<above hash>))
     // optionally also return i. leaf ii. merkle root (to be updated) iii. session id (default or custom)

  }*/

  // methods to access local storage reads and writes -> updateLeafData() 

  // then call account.buildUserOp()

  async createSession(): Promise<string> {
    const sessionKeyModuleAbi = 'function setMerkleRoot(bytes32 _merkleRoot)'
    const sessionKeyModuleInterface = new ethers.utils.Interface([sessionKeyModuleAbi])
    const setMerkleRootData = sessionKeyModuleInterface.encodeFunctionData('setMerkleRoot', [
      await this.getMerkleRoot()
    ])
    return setMerkleRootData
  }

  // optionally accepts signer?

  async signUserOp(userOp: UserOperation, sessionSigner?: Signer, sessionId?: string): Promise<string> {
    const userOpHash = getUserOpHash(userOp, this.entryPointAddress, this.chainId)
    //
    const signature = await sessionSigner.signMessage(arrayify(userOpHash))
    // add validator module address to the signature


    // Require below info now
    /**
      validUntil, 
      validAfter, 
      sessionValidationModuleAddress, 
      sessionKeyData, 

      merkleProof, 
     */


    // Fetch leaf based on sessionValidationModuleAddress and session pub key (from signer) 
    // session signer and leaf can also be fetched from id ? 

    // create leaf (fetch from storage / using info from storage)

    // using the leaf get proof using merkleTree.getHexProof()

    // make padded sig
    
    // return moduleSignature
    return '0x'
  }

  async signMessage(message: Bytes | string): Promise<string> {
    return await this.sessionSigner.signMessage(message)
  }

  async getMerkleRoot(): Promise<string> {
    // TODO: use nodeclient / local storage to get merkle proof

    // const merkleProofData = await this.nodeClient.getMerkleProof(
    //   this.sessionKeyModule,
    //   this.sessionKey.getAddress()
    // )
    // console.log(merkleProofData)

    const merkleProofData: any[] = []

    const merkleTreeInstance = new MerkleTree(merkleProofData, keccak256, {
      sortPairs: false,
      hashLeaves: false
    })

    const validUntil = 0
    const validAfter = 0
    const sessionEOA = await this.sessionSigner.getAddress()
    const sessionKeyData = hexZeroPad(sessionEOA, 20)
    const newLeafData = hexConcat([
      hexZeroPad(ethers.utils.hexlify(validUntil), 6),
      hexZeroPad(ethers.utils.hexlify(validAfter), 6),
      hexZeroPad(this.getAddress(), 20), // TODO // actually session validation module address
      sessionKeyData
    ])

    // Todo: verify addLeaves expects buffer
    merkleTreeInstance.addLeaves([Buffer.from(keccak256(newLeafData))])

    return merkleTreeInstance.getHexRoot()
  }
}
