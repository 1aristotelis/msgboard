
import config from './config'

import { start as server } from './server'

import { knex } from './knex';

import { start as actors } from './rabbi/actors'

import { spawn } from 'child_process';

import  { sync_boost_orders, sync_twetch, sync_msgboard} from "./bitbus"

import { onchain } from './rabbi/bitsocket';

import { log } from './log';

import { getTransaction } from './whatsonchain';
import * as whatsonchain from './whatsonchain'

import { BoostPowJob, BoostPowJobProof } from 'boostpow'


const app_id = process.env.APP_ID
const boost_app_id = "18pPQigu7j69ioDcUG9dACE1iAN9nCfowr"


export async function start() {
  
  await knex.migrate.latest()

  const nextjs = spawn("npm", ["run", "dev"], {
    cwd: `${process.cwd()}/web-ui`
  })

  if (config.get('http_api_enabled')) {

    server();

  }

  if (config.get('amqp_enabled')) {

    actors();

  }

  //sync_boost_orders()

  const boostpow = onchain(boost_app_id)

  boostpow.on('*', (event)=> {
    log.info('onchain.boostpow.event', event)
  })

  boostpow.on('proof', async ({tx_id})=>{

    log.info(`onchain.${boost_app_id}.proof`, {tx_id})

    if (tx_id) {

      let tx = await getTransaction(tx_id)

      console.log((tx.toString()))

      let proof = BoostPowJobProof.fromTransaction(tx)

      if (proof) {

        console.log(proof)

        let json = Object.assign(proof.toObject(), {
          tx_id: proof.txid,
          tx_index: proof.vin
        })

        const job_tx = await getTransaction(proof.spentTxid)

        const job = BoostPowJob.fromTransaction(job_tx)

        json = Object.assign(json, { 
          job_tx_id: job.txid,
          job_tx_index: job.vout,
          content: job.content.hex,
          tag: job.tag.hex,
          difficulty: job.difficulty,
          value: job.value,
          timestamp: new Date()
        })

        console.log(json)

        const [record] = await knex('boostpow_proofs').where({
          tx_id:json.tx_id,
          tx_index: json.tx_index
        })
        .select('*')

        console.log('record', record)

        if (!record) {

          try {

            let woc_tx = await whatsonchain.getTransaction(json.tx_id)

            console.log({ woc_tx })

            if (woc_tx && woc_tx.time) {

              json['timestamp'] = woc_tx.time

            }

          } catch(error) {

            log.error('whatsonchain.get_transaction', error)

          }

          try {

            const result = await knex('boostpow_proofs').insert(json)

            console.log(result)

          } catch(error) {

            log.debug('knex.boostpow_proofs.insert.error', { error, json })

            log.error('knex.boostpow_proofs.insert', error)

          }
        }

      }
    }
  })

  boostpow.on('job', (job) => {
    log.info(`onchain.${boost_app_id}.job`, job)
  })


  sync_msgboard()

  const msgboard = onchain(app_id)

  msgboard.on('*', (event)=> {
    log.info(`onchain.${app_id}.event`, event)
  })

  msgboard.on('post', (value)=> {
    log.info(`onchain.${app_id}.post`, value)
  })

  msgboard.on('error', (error)=> {
    log.info(`onchain.${app_id}.error`, error)
  })

  //sync_twetch()

}

if (require.main === module) {

  start()

}
