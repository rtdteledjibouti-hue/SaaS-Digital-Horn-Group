import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WAAFIPAY_BASE_URL = "https://api.waafipay.net";
const MERCHANT_UID = Deno.env.get("WAAFIPAY_MERCHANT_UID") ?? "";
const API_USER_ID = Deno.env.get("WAAFIPAY_API_USER_ID") ?? "";
const API_KEY = Deno.env.get("WAAFIPAY_API_KEY") ?? "";

const PLAN_PRICES: Record<string, { amount: number; currency: string }> = {
  business: { amount: 15000, currency: "DJF" },
  enterprise: { amount: 50000, currency: "DJF" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json();
    const { plan, phone, action, referenceId } = body;

    if (action === "check-status" && referenceId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("reference_id", referenceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!sub) {
        return new Response(JSON.stringify({ error: "Transaction introuvable" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: sub.status, subscription: sub }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plan || !phone) {
      return new Response(JSON.stringify({ error: "Plan et numéro de téléphone requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceInfo = PLAN_PRICES[plan];
    if (!priceInfo) {
      return new Response(JSON.stringify({ error: "Plan invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!MERCHANT_UID || !API_USER_ID || !API_KEY) {
      return new Response(JSON.stringify({ error: "WaafiPay non configuré. Contactez l'administrateur." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return new Response(JSON.stringify({ error: "Numéro de téléphone invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const referenceIdGen = `DHG-${userId.slice(0, 8)}-${Date.now()}`;
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

    const waafiRequest = {
      schemaVersion: "1.0",
      requestId,
      timestamp,
      channelName: "WEB",
      serviceName: "API_PURCHASE",
      serviceParams: {
        merchantUid: MERCHANT_UID,
        apiUserId: API_USER_ID,
        apiKey: API_KEY,
        paymentMethod: "MWALLET_ACCOUNT",
        payerInfo: {
          accountNo: cleanPhone,
        },
        transactionInfo: {
          referenceId: referenceIdGen,
          invoiceId: referenceIdGen,
          amount: priceInfo.amount,
          currency: priceInfo.currency,
          description: `Abonnement plan ${plan} - Digital Horn Group`,
        },
      },
    };

    const waafiResponse = await fetch(`${WAAFIPAY_BASE_URL}/asm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(waafiRequest),
    });

    const waafiData = await waafiResponse.json();

    let subStatus: "pending" | "approved" | "failed" = "pending";
    if (waafiData.responseCode === "2001" && waafiData.params?.state === "APPROVED") {
      subStatus = "approved";
    } else if (waafiData.responseCode && waafiData.responseCode !== "2001") {
      subStatus = "failed";
    }

    const { data: subRecord, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan,
        amount: priceInfo.amount,
        currency: priceInfo.currency,
        phone: cleanPhone,
        reference_id: referenceIdGen,
        waafi_transaction_id: waafiData.params?.transactionId ?? null,
        status: subStatus,
      })
      .select()
      .single();

    if (subError) {
      return new Response(JSON.stringify({ error: "Erreur lors de l'enregistrement de la transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subStatus === "approved") {
      await supabase
        .from("profiles")
        .update({ plan, plan_status: "active" })
        .eq("id", userId);
    }

    return new Response(
      JSON.stringify({
        status: subStatus,
        referenceId: referenceIdGen,
        waafiResponse: waafiData,
        subscription: subRecord,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
