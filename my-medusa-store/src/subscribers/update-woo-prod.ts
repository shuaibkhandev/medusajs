import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

export default async function productUpdateSubscriber({
  event,
  container,
}: SubscriberArgs): Promise<void> {
  const logger = container.resolve("logger")

  const WOO_BASE = "http://localhost/medusa/wp-json/wc/v3"
  const CONSUMER_KEY = "ck_b366a754f42111a9909b13bd61b33d343d59b708"
  const CONSUMER_SECRET = "cs_74a643b1e50d525b0612193c4db83d9076119d06"

  // 🔐 OAuth setup
  const oauth = new OAuth({
    consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64")
    },
  })

  try {
    const medusaProductId = event.data.id
    logger.info(`🔁 Medusa product.updated event for: ${medusaProductId}`)

    // ✅ Use proper product module reference
    const productService = container.resolve(Modules.PRODUCT)

    // Get updated product from Medusa
    const medusaProduct = await productService.retrieveProduct(medusaProductId)
    if (!medusaProduct) {
      logger.warn(`⚠️ No Medusa product found for ID: ${medusaProductId}`)
      return
    }

    // 🔹 Fetch WooCommerce products
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

    // 🔹 Find Woo product with same Medusa ID
    const wooProduct = allProducts.find(
      (p: any) =>
        Array.isArray(p.meta_data) &&
        p.meta_data.some(
          (meta: any) =>
            meta.key === "medusa_product_id" && meta.value === medusaProductId
        )
    )

    if (!wooProduct) {
      logger.warn(`⚠️ No WooCommerce product found for Medusa ID: ${medusaProductId}`)
      return
    }

    logger.info(
      `✅ Found Woo product (Woo ID: ${wooProduct.id}) for Medusa ID: ${medusaProductId}`
    )

    // 🔹 Prepare update payload
    const updateData: Record<string, any> = {
      name: medusaProduct.title,
      description: medusaProduct.description || "",
      regular_price:
        medusaProduct?.variants?.[0]?.prices?.[0]?.amount
          ? (medusaProduct.variants[0].prices[0].amount / 100).toString()
          : undefined,
      sku: medusaProduct?.variants?.[0]?.sku || undefined,
      images: medusaProduct.thumbnail ? [{ src: medusaProduct.thumbnail }] : [],
      meta_data: [
        ...(wooProduct.meta_data || []),
        { key: "medusa_product_id", value: medusaProductId },
      ],
    }

    logger.info("📦 Update payload sent to Woo:", JSON.stringify(updateData, null, 2))

    // 🔹 Update Woo product
    const updateUrl = `${WOO_BASE}/products/${wooProduct.id}`
    const updateReqData = { url: updateUrl, method: "PUT" }
    const updateAuth = oauth.authorize(updateReqData)

    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...oauth.toHeader(updateAuth),
      },
      body: JSON.stringify(updateData),
    })

    const text = await updateResponse.text()
    logger.info("📡 Woo raw response:", text)

    if (!updateResponse.ok) {
      throw new Error(`Woo update failed (${updateResponse.status}): ${text}`)
    }

    logger.info(
      `✅ Updated Woo product (${wooProduct.id}) from Medusa product: ${medusaProductId}`
    )
  } catch (err: any) {
    logger.error("❌ Error syncing product update to Woo:", err.message || err)
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
