import { knex } from "./knex";
import { Crawler } from "./rabbi/bitbus";
import { log } from './log'
import * as whatsonchain from "./whatsonchain"


export const onchainQueue = require('fastq').promise(handleOnChainTransaction, 1)
export const twetchQueue = require('fastq').promise(handleTwetchTransaction, 1)

export async function sync_boost_orders(){

    const block_height_start = 0 

    const crawler = new Crawler({

        query: {
            q: {
                find: { "out.s0": "boostpow", "blk.i": { "$gt": block_height_start } },
            }
        },

        onTransaction: async (json) => {

        }
    })

    crawler.start()
}

export interface TwetchTransaction {
    tx_id: string;
    tx_index: number;
    timestamp:number;
    content: string;
    media_type: string;
    encoding: string;
    filename: string;
    tw_data_json: string;
    url: string;
    comment: string;
    replyTx: string;
    type: string;
    app: string;
    address: string;
}

export async function sync_twetch(){

    const app_id = "19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut"
    const crawler = new Crawler({
        query: {
            q: {
                find: {
                    "out.s2": app_id
                },
                project: {
                    "blk": 1,
                    "tx.h": 1,
                    "tx.t": 1,
                    "timestamp":1,
                    "out.i": 1,
                    "out.s2":1,
                    "out.s3":1,
                    "out.s4":1,
                    "out.s5":1,
                    "out.s6":1,
                    "out.s7":1,
                    "out.s8":1,
                    "out.s9":1,
                    "out.s10":1,
                    "out.s11":1,
                    "out.s12":1,
                    "out.s13":1,
                    "out.s14":1,
                    "out.s15":1,
                    "out.s16":1,
                    "out.s17":1,
                    "out.s18":1,
                    "out.s19":1,
                    "out.s20":1,
                    "out.s21":1,
                    "out.s22":1,
                    "out.s23":1,
                    "out.s24":1,
                    "out.s25":1,
                    "out.s26":1,
                    "out.s27":1,
                    "out.s28":1,
                    "out.s29":1,
                    "out.s30":1,
                    "out.s31":1,
                }
            }, 
        },
        onTransaction: (json) => {
            console.log(json)

            let outputs = json.out
            .filter(({s2}) => s2 === app_id)
            
            outputs.map(output => {

                let message:TwetchTransaction = {
                    tx_id: json['tx']['h'],
                    tx_index: output['i'],
                    timestamp: json['timestamp'],
                    content: output['s3'],
                    media_type: output['s4'],
                    encoding: output['s5'],
                    filename: output['s6'],
                    tw_data_json: output['s11'],
                    url: output['s13'],
                    comment: output['s15'],
                    replyTx: output['s19'],
                    type: output['s21'],
                    app: output['s25'],
                    address: output['s31']
                }

                console.log(message)

                onchainQueue.push(message)
                    
            })
        }
    })

    crawler.start()
}

export interface OnchainTransaction {
    tx_id: string;
    tx_index:number;
    app_id: string;
    key: string;
    value: any;
    nonce?: string;
    author?: string;
    signature?: string;
    source?: string;
}

export async function sync_msgboard() {
    const app_id = process.env.APP_ID

    return sync_onchain_app(app_id)
    
}

export async function sync_onchain_app(app_id){
    
    const block_height_start = 738000

  const crawler = new Crawler({

    query: {
      q: {
        find: {
          "out.s2": "onchain",
          "out.s3": app_id,
          "blk.i": {
            "$gt": block_height_start
          }
        },
        project: {
          "blk": 1,
          "tx.h": 1,
          "tx.t": 1,
          "out.i": 1,
          "out.s2": 1,
          "out.s3": 1,
          "out.s4": 1,
          "out.s5": 1,
          "out.s6": 1,
          "out.s7": 1,
          "out.s8": 1,
          "out.s9": 1,
          "out.s10": 1,
          "out.s11": 1,
          "out.o1": 1
        }
      }
    },

    onTransaction: (json) => {

      let outputs = json.out
        .filter(({s2}) => s2 === 'onchain')
        .filter(({s3}) => s3 === app_id)

      outputs.map(output => {

        console.log('_json1', output)

        var value = output['s5']

        if (typeof value === 'string') {

          value = JSON.parse(value)

        }

        let message: OnchainTransaction = {
          tx_id: json['tx']['h'],
          tx_index: output['i'],
          app_id: output['s3'],
          key: output['s4'],
          value,
          nonce: output['s6'],
          author: output['s7'],
          signature: output['s8'],
          source: 'bitbus'
        }

        console.log(message)

        onchainQueue.push(message)

      })

    }
  })

  crawler.start()

}

export async function handleTwetchTransaction(data: TwetchTransaction){

    var { tx_id, tx_index, timestamp, content, media_type, encoding, filename, tw_data_json, url, comment, replyTx, type, app, address } = data

    try {

        let [record] = await knex('twetch_events').where({
            tx_id: data.tx_id,
            tx_index: data.tx_index
        }).select('id')

        if (record){

            log.debug(`twetch.transaction.duplicate, ${data}`)       
        } else {


        }
        
    } catch (error) {

        const insert = {
            tx_id,
            tx_index, 
            timestamp,
            content, 
            media_type,
            encoding,
            filename, 
            tw_data_json, 
            url, 
            comment, 
            replyTx,
            type,
            app,
            address
        }

        const result = await knex('twetch_events').insert(insert)

            log.info('twetch.event.recorded', insert)
        
    }
}

export async function handleOnChainTransaction(data: OnchainTransaction){

    var { tx_id, tx_index, app_id, key, value, nonce, author, signature } = data

    try {
        
        if (typeof value === 'string') {
            
            value = JSON.parse(value)

        }

    } catch (error) {
        
        log.debug('handleTransaction.error', error)

        return
    }

    try {
        
        let [record] = await knex('events').where({
            tx_id: data.tx_id,
            tx_index: data.tx_index
        }).select('id')

        if(record){

            log.debug('transaction.duplicate, data')

        } else {

            const insert = {
                tx_id,
                tx_index,
                app_id,
                key,
                value,
            }

            if (nonce) { insert['nonce'] = nonce }

            if (nonce) { insert['author'] = author }
            
            if (nonce) { insert['signature'] = signature }

            const result = await knex('events').insert(insert)

            log.info('event.recorded', insert)
        }

        if (key === 'post') {
            try {
                
                return handlePost(data)
            } catch (error) {
                
                log.error('handlePost', error)
            }
        }

        

    } catch (error) {
        
    }
}

async function handlePost(data: OnchainTransaction) {

    if (typeof data.value === 'string') {
  
      data.value = JSON.parse(data.value)
  
    }
  
    var { value, tx_id, tx_index, author } = data
  
    let [post] = await knex('posts').where({ tx_id }).select('*')
    let timestamp = null 
  
    try {
  
      let woc_tx = await whatsonchain.getTransaction(tx_id)
  
      console.log({ woc_tx })
  
      if (woc_tx && woc_tx.time) {
  
        timestamp = woc_tx.time
  
      }
  
    } catch(error) {
  
      log.error('whatsonchain.get_transaction', error)
  
    }
  
    if (post && post.created_at !== timestamp){
      let record = await knex('questions').where({ tx_id: tx_id}).update({ created_at: timestamp})
      log.info('question.updated', { timestamp, record })
    }
  
  
    if (!post) {
  
      const insert = {
        tx_id,
        tx_index,
        created_at: timestamp,
        content: value.content,
        replyTx: value.replyTx,
        replyCount:0,
        difficulty:0,
        author
      }
  
      log.info('post.insert', insert)
  
      let record = await knex('post').insert(insert)
  
      log.info('post.recorded', { insert, record })
  
    }
  
  }