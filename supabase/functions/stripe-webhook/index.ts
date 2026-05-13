import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not set' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const body = await req.text()

  let event: Stripe.Event

  // If webhook secret is configured, verify the signature
  if (webhookSecret) {
    const sig = req.headers.get('stripe-signature')
    if (!sig) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
  } else {
    // No webhook secret — parse body directly (dev mode)
    event = JSON.parse(body)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session.metadata?.user_id
    const customerId = session.customer

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'elite',
          stripe_customer_id: customerId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('Failed to upgrade user:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }
      console.log(`✅ User ${userId} upgraded to elite`)
    }
  }

  // Handle customer.subscription.deleted (downgrade)
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as any
    const customerId = sub.customer

    if (customerId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('Failed to downgrade user:', error)
      } else {
        console.log(`⬇️ Customer ${customerId} downgraded to free`)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
})
