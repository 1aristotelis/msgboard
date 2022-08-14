
import { Author } from './authors'

import { Post } from "./posts"

import { Transaction } from './transactions'

export interface Order {

  author?: Author;

  content: Post;

  transaction: Transaction;

}