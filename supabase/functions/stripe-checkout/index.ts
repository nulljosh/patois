// Creates a Stripe Checkout Session for a one-time "Patois Pro" unlock.
// Requires env secrets: STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, SITE_URL.
// Deploy: supabase functions deploy stripe-checkout
import Stripe from 'https://esm.sh/stripe@17?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://patois.jaybulb.com';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { user_id } = await req.json();
  if (!user_id) return new Response('Missing user_id', { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: Deno.env.get('STRIPE_PRO_PRICE_ID')!, quantity: 1 }],
    client_reference_id: user_id,
    success_url: `${SITE_URL}/app/?pro=success`,
    cancel_url: `${SITE_URL}/app/?pro=cancelled`,
  });

  return Response.json({ url: session.url });
});
