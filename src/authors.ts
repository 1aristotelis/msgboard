
import { Post } from './posts'

import { Order } from './orders'

import { Proof } from './proofs'

export interface Author {

  public_key: string;

  paymail?: string;

  posts?: Post[]

  proofs?: Proof[];

  orders?: Order[];

}
