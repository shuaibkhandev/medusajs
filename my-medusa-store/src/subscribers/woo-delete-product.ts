import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

export default async function productDeleteSubscriber({
  event,
  container,
}: SubscriberArgs): Promise<void> {
  const logger = container.resolve("logger")

  const WOO_BASE = "http://localhost/medusa/wp-json/wc/v3"
  const CONSUMER_KEY = "ck_b366a754f42111a9909b13bd61b33d343d59b708"
  const CONSUMER_SECRET = "cs_74a643b1e50d525b0612193c4db83d9076119d06"

  // 🔐 Create OAuth 1.0 signer
  const oauth = new OAuth({
    consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64")
    },
  })

  try {
    const medusaProductId = event.data.id
    logger.info(`🗑️ Medusa product.deleted event for: ${medusaProductId}`)

    // 🔹 Step 1: Fetch WooCommerce products (limit to 100 per page)
    const searchUrl = `${WOO_BASE}/products?per_page=100`
    const searchReqData = { url: searchUrl, method: "GET" }
    const searchAuth = oauth.authorize(searchReqData)

    const searchResponse = await fetch(searchUrl, {
      method: "GET",
      headers: oauth.toHeader(searchAuth),
    })

    if (!searchResponse.ok) {
      const text = await searchResponse.text()
      throw new Error(`Woo fetch failed (${searchResponse.status}): ${text}`)
    }

    const allProducts = await searchResponse.json()

    // 🔹 Step 2: Find product whose meta_data contains our Medusa product ID
    const wooProduct = allProducts.find((p: any) =>
      Array.isArray(p.meta_data) &&
      p.meta_data.some(
        (meta: any) =>
          meta.key === "medusa_product_id" &&
          meta.value === medusaProductId
      )
    )

    if (!wooProduct) {
      logger.warn(`⚠️ No WooCommerce product found for Medusa ID: ${medusaProductId}`)
      return
    }

    logger.info(`✅ Found Woo product (Woo ID: ${wooProduct.id}) for Medusa ID: ${medusaProductId}`)

    // 🔹 Step 3: Delete that Woo product
    const deleteUrl = `${WOO_BASE}/products/${wooProduct.id}?force=true`
    const deleteReqData = { url: deleteUrl, method: "DELETE" }
    const deleteAuth = oauth.authorize(deleteReqData)

    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: oauth.toHeader(deleteAuth),
    })

    if (!deleteResponse.ok) {
      const text = await deleteResponse.text()
      throw new Error(`Woo delete failed (${deleteResponse.status}): ${text}`)
    }

    const result = await deleteResponse.json()
    logger.info(`🗑️ Deleted WooCommerce product: ${wooProduct.name} (Woo ID: ${wooProduct.id})`, result)

  } catch (err: any) {
    logger.error("❌ Error syncing product delete to Woo:", err.message || err)
  }
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
