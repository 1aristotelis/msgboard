
import { log } from './log'

import { Author } from './authors'

import { Transaction } from './transactions'

import config from './config'

import { Wallet } from './wallet'

import { knex } from './knex'

type PostsStore = {
  [key: string]: Post
}

class PostNotFound extends Error {
  message = 'post not found'
  name = 'PostNotFound'
  code = 404
}

export const posts: PostsStore = {}

export interface Post {

  content: string;

  transaction: Transaction;

  inReplyTo?: Post;

  replies?: Post[];

  author?: Author;

}

interface Query {
  start_timestamp?: Date;
  end_timestamp?: Date;
  author_paymail?: string;
  author_public_key?: string;
}

export async function list(query: Query = {}): Promise<Post[]> {

  let result = await knex('events').where({
    key: 'post'
  }).select('*')

  return result

}

export async function find(txid: string): Promise<Post> {

  let post = posts[txid]

  if (!post) {

    throw new PostNotFound()

  }

  return post

}

export async function loadSeeds() {

  /* const questions = [{
    app_id: '1HWaEAD5TXC2fWHDiua9Vue3Mf8V1ZmakN',
    key: 'question',
    value: '{"content":"Who is the best philosopher living today?"}',
    txid: '9a489f00201a584f3c426ece03e184bacdc41d83b044daf1b5cd1f85adb1c567',
    timestamp: 1657463986717,
    index: 0,
    eventsource: true
  }] */



}

interface PostOptions {
  broadcast?: boolean;
}

export async function post(wallet: Wallet, content: string, options: PostOptions ={}): Promise<Post> {

  let transaction = await wallet.publish('post', { content })

  return {
    content,
    replies: [],
    transaction: {
      txid: transaction.hash,
      hex: transaction.serialize()
    }
  }

}

interface NewReply {
  inReplyTo: Post;
  content: string;
}

export async function reply(wallet: Wallet, newReply: NewReply): Promise<Post> {

  let utxos = await wallet.sync()

  let transaction = await wallet.publish('answer', {
    txid: newReply.inReplyTo.transaction.txid,
    content: newReply.content
  })

  return {
    inReplyTo: newReply.inReplyTo,
    content: newReply.content,
    transaction: {
      txid: transaction.hash,
      hex: transaction.serialize()
    }
  }

}

interface PostsQuery {
  start_timestamp?: string;
  end_timestamp?: string;
}

export async function loadPosts(query: PostsQuery={}): Promise<Post[]> {

  const start_timestamp = query.start_timestamp || 0;

  const end_timestamp = query.end_timestamp || Date.now();


  log.info('posts.load.query', { start_timestamp, end_timestamp })

  let boostedPosts = await knex('posts')
    .join('boostpow_proofs', 'posts.tx_id', 'boostpow_proofs.content')
    .where('boostpow_proofs.timestamp', '>=', start_timestamp)
    .where('boostpow_proofs.timestamp', '<=', end_timestamp)
    .select(['posts.*', 'difficulty'])
    .sum('difficulty as difficulty')
    .groupBy('boostpow_proofs.content')
    .orderBy('difficulty', 'desc')

  let allPosts = await knex('posts')
    .where('id', 'not in', boostedPosts.map(q => q.id))
    .orderBy('id', 'desc')
    .limit(100)
    .select('*')


  allPosts = allPosts.map(post => {

    if (!post.difficulty) {

      post.difficulty = 0

    }

    return post

  })

  const posts = [...boostedPosts, ...allPosts].sort((a, b) => {

    var diff_a = a.difficulty || 0
    var diff_b = b.difficulty || 0

    return diff_a < diff_b ? 1 : 0

  })

  return posts

}

interface LoadPost {
  tx_id: string;
  tx_index?: number;
  start_timestamp?: number;
  end_timestamp?: number;
}

export async function loadPost(query: LoadPost): Promise<Post> {

  const start_timestamp = query.start_timestamp || 0;

  const end_timestamp = query.end_timestamp || Date.now();

  log.debug('post.load.query', query)

  let [post] = await knex('posts')
    .join('boostpow_proofs', 'posts.tx_id', 'boostpow_proofs.content')
    .where('boostpow_proofs.timestamp', '>=', start_timestamp)
    .where('boostpow_proofs.timestamp', '<=', end_timestamp)
    .where('posts.tx_id', query.tx_id)
    .sum('difficulty as difficulty')
    .groupBy('boostpow_proofs.content')
    .orderBy('difficulty', 'desc')
    .select(['posts.*', 'difficulty'])

  if (post) {

    return post

  }

  let [unBoosted] = await knex('posts')
      .where('tx_id', query.tx_id)
      .select('*')

  unBoosted.difficulty = 0

  return unBoosted

}

interface LoadReplies {
    tx_id: string;
    tx_index?: number;
    start_timestamp?: number;
    end_timestamp?: number;
  }
  
  export async function loadReplies(query: LoadReplies): Promise<Post[]> {
  
    const start_timestamp = query.start_timestamp || 0;
  
    const end_timestamp = query.end_timestamp || Date.now();
  
    log.debug('replies.load.query', query)
  
    let replies = await knex('posts')
      .join('boostpow_proofs', 'posts.tx_id', 'boostpow_proofs.content')
      .where('boostpow_proofs.timestamp', '>=', start_timestamp)
      .where('boostpow_proofs.timestamp', '<=', end_timestamp)
      .where('posts.reply_tx_id', query.tx_id)
      .sum('difficulty as difficulty')
      .groupBy('boostpow_proofs.content')
      .orderBy('difficulty', 'desc')
      .select(['posts.*', 'difficulty'])
  
      replies = replies.map(post => {

        if (!post.difficulty) {
    
          post.difficulty = 0
    
        }
    
        return post
    
      })
    
      return replies
  
  }
