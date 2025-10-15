// import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
// import { Modules } from "@medusajs/framework/utils"

// export async function POST(req: MedusaRequest, res: MedusaResponse) {
//   console.log("✅ WooCommerce Webhook Called")

//   try {
//     // ✅ Ensure JSON body parsing works
//     let body: any
//     try {
//       body = typeof req.body === "object" && req.body !== null
//         ? req.body
//         : await req.json?.()
//     } catch {
//       const text = await req.text?.()
//       body = text ? JSON.parse(text) : {}
//     }

//     console.log("🛒 Webhook Raw Body:", body)

//     const title = body?.name || "Untitled Product"
//     const description = body?.description || "No description provided"
//     const thumbnail = body?.images?.[0]?.src || null
//     const sku = body?.sku || `woo-${Date.now()}`

//     console.log("🛍️ Creating product in Medusa:", { title, sku, thumbnail })

//     // ✅ Create product using Medusa Product module
//     const productModuleService = req.scope.resolve(Modules.PRODUCT)
//     const uniqueHandle = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`

//     const [product] = await productModuleService.createProducts([
//       {
//         title,
//         handle: uniqueHandle,
//         description,
//         thumbnail,
//         status: "published",
//         variants: [
//           {
//             title: `${title} Variant`,
//             sku,
//             prices: [{ amount: 1000, currency_code: "usd" }],
//           },
//         ],
//       },
//     ])

//     console.log("✅ Product Created in Medusa:", product.id)

//     // ✅ Always send a response (important!)
//     return res.status(200).json({
//       success: true,
//       message: "Product created successfully in Medusa",
//       product,
//     })
//   } catch (err: any) {
//     console.error("❌ Webhook Error:", err)
//     return res.status(500).json({ error: err.message })
//   }
// }


// import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
// import { Modules } from "@medusajs/framework/utils"

// export async function POST(req: MedusaRequest, res: MedusaResponse) {
//   console.log("✅ WooCommerce Webhook Called")

//   try {
//     // ✅ Parse JSON safely
//     let body: any
//     try {
//       body = typeof req.body === "object" && req.body !== null
//         ? req.body
//         : await req.json?.()
//     } catch {
//       const text = await req.text?.()
//       body = text ? JSON.parse(text) : {}
//     }

//     console.log("🛒 Webhook Raw Body:", body)

//     // ✅ Extract WooCommerce data
//     const wooId = body?.id
//     const title = body?.name || "Untitled Product"
//     const description = body?.description || "No description provided"
//     const thumbnail = body?.images?.[0]?.src || null
//     const sku = body?.sku || `woo-${Date.now()}`

//     console.log("🛍️ Creating product in Medusa:", { title, sku, wooId })

//     // ✅ Resolve Medusa product module
//     const productModuleService = req.scope.resolve(Modules.PRODUCT)
//     const uniqueHandle = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`

//     // ✅ Create Medusa product and store WooCommerce ID in metadata
//     const [product] = await productModuleService.createProducts([
//       {
//         title,
//         handle: uniqueHandle,
//         description,
//         thumbnail,
//         status: "published",
//         metadata: {
//           woo_id: wooId, // <—— store Woo ID here
//         },
//         variants: [
//           {
//             title: `${title} Variant`,
//             sku,
//             prices: [{ amount: 1000, currency_code: "usd" }],
//           },
//         ],
//       },
//     ])

//     console.log("✅ Product Created in Medusa:", product.id)

//     // ✅ Send success response
//     return res.status(200).json({
//       success: true,
//       message: "Product created successfully in Medusa",
//       product,
//     })
//   } catch (err: any) {
//     console.error("❌ Webhook Error:", err)
//     return res.status(500).json({ error: err.message })
//   }
// }

import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("✅ WooCommerce Webhook Called")

  const WOO_BASE = "http://localhost/medusa/wp-json/wc/v3"
  const CONSUMER_KEY = "ck_b366a754f42111a9909b13bd61b33d343d59b708"
  const CONSUMER_SECRET = "cs_74a643b1e50d525b0612193c4db83d9076119d06"

  // Create OAuth signer
  const oauth = new OAuth({
    consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64")
    },
  })

  try {
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

    // ✅ Create Medusa product
    const [product] = await productModuleService.createProducts([
      {
        title,
        handle: uniqueHandle,
        description,
        thumbnail,
        status: "published",
        metadata: { woo_id: wooId },
        variants: [
          {
            title: `${title} Variant`,
            sku,
            prices: [{ amount: 1000, currency_code: "usd" }],
          },
        ],
      },
    ])

    console.log("✅ Product Created in Medusa:", product.id)

    // ✅ Step 2: Update Woo product with Medusa ID via OAuth 1.0a
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
          { key: "medusa_product_id", value: product.id },
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
      message: "Product created in Medusa and synced with Woo",
      product,
    })
  } catch (err: any) {
    console.error("❌ Webhook Error:", err)
    return res.status(500).json({ error: err.message })
  }
}
