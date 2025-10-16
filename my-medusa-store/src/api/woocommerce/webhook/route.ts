import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("✅ WooCommerce Webhook Called")

  // WooCommerce API credentials
  const WOO_BASE = "http://localhost/medusa/wp-json/wc/v3"
  const CONSUMER_KEY = "ck_b366a754f42111a9909b13bd61b33d343d59b708"
  const CONSUMER_SECRET = "cs_74a643b1e50d525b0612193c4db83d9076119d06"

  // Create OAuth signer
  const oauth = new OAuth({
    consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto
        .createHmac("sha1", key)
        .update(base_string)
        .digest("base64")
    },
  })

  try {
    // ✅ Step 1: Parse incoming body
    let body: any = {}
    try {
      body =
        typeof req.body === "object" && req.body !== null
          ? req.body
          : await req.json?.()
    } catch {
      const text = await req.text?.()
      body = text ? JSON.parse(text) : {}
    }

    const wooId = body?.id
    const title = body?.name || "Untitled Product"
    const description = body?.description || "No description provided"
    const thumbnail = body?.images?.[0]?.src || null
    const sku = body?.sku || `woo-${Date.now()}`

    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    const uniqueHandle = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`

    // ✅ Step 2: Create Medusa product
    const [product] = await productModuleService.createProducts([
      {
        title,
        handle: uniqueHandle,
        description,
        thumbnail,
        status: "published",
        metadata: {
          woo_id: wooId,
        },
        variants: [
          {
            title: `${title} Variant`,
            sku,
            prices: [
              {
                amount: 1000,
                currency_code: "usd",
              },
            ],
          },
        ],
      },
    ])

    console.log("✅ Product Created in Medusa:", product.id)

    // ✅ Step 3: Update Woo product with Medusa ID via OAuth 1.0a
    const wooUrl = `${WOO_BASE}/products/${wooId}`
    const wooReqData = { url: wooUrl, method: "PUT" }
    const wooAuth = oauth.authorize(wooReqData)

    const updateRes = await fetch(wooUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...oauth.toHeader(wooAuth),
      },
      body: JSON.stringify({
        meta_data: [
          ...(body.meta_data || []),
          {
            key: "medusa_product_id",
            value: product.id,
          },
        ],
      }),
    })

    console.log("📡 Woo update status:", updateRes.status)
    const txt = await updateRes.text()
    console.log("📦 Woo response:", txt)

    if (!updateRes.ok) {
      throw new Error(`Woo update failed (${updateRes.status}): ${txt}`)
    }

    console.log(`🔗 Synced Medusa ID (${product.id}) → Woo product ${wooId}`)

    return res.status(200).json({
      success: true,
      message: "✅ Product created in Medusa and synced with WooCommerce",
      product,
    })
  } catch (err: any) {
    console.error("❌ Webhook Error:", err)
    return res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}
