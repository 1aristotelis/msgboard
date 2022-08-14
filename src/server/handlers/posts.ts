
import { knex } from '../../knex'

import { badRequest, notFound } from 'boom'

import { loadPost, loadPosts, loadReplies } from '../../posts'


export async function create(req, h) {

}

export async function build(req, h) {

}

export async function index(req, h) {

  try {

    let posts = await loadPosts(req.query)

    return {

      posts

    }

  } catch(error) {

    return badRequest(error)

  }

}

interface Post {

}



export async function show(req, h) {

  try {

    const post = await loadPost({ tx_id: req.params.tx_id })

    if (!post) {

      return notFound()

    }

    const replies = await loadReplies({
      inReplyTo: req.params.tx_id,
      ...req.query
    })

    return {

      post,

      replies

    }

  } catch(error) {

    return badRequest(error)

  }



}

