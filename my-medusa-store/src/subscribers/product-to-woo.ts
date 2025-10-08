import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"

export default async function productToWooSubscriber({
  event,
  container,
}: SubscriberArgs): Promise<void> {
  const logger = container.resolve("logger")
  const productModule = container.resolve(Modules.PRODUCT)

  try {
    // ✅ Step 1: Get product ID from event
    const productId = event.data.id
    logger.info(`Received product.created event for ${productId}`)

    // ✅ Step 2: Fetch full Medusa product
    const product = await productModule.retrieveProduct(productId, {
      relations: ["images", "variants", "options"],
    })
    logger.info("Full product data fetched:", product)

    // ✅ Step 3: Prepare WooCommerce API client
    const api = new WooCommerceRestApi({
      url: "http://localhost/medusa",
      consumerKey: "ck_b366a754f42111a9909b13bd61b33d343d59b708",
      consumerSecret: "cs_74a643b1e50d525b0612193c4db83d9076119d06",
      version: "wc/v3",
      queryStringAuth: true,
    })

    // ✅ Step 4: Map Medusa → WooCommerce product fields
    const wooProductData = {
      name: product.title,
      type: "simple",
      regular_price: product.variants?.[0]?.prices?.[0]?.amount
        ? String(product.variants[0].prices[0].amount / 100)
        : "0",
      description: product.description,
      short_description: product.subtitle,
      images: product.images?.map((img: any) => ({ src: img.url })) || [],
      sku: product.variants?.[0]?.sku || "",
      stock_quantity: product.variants?.[0]?.inventory_quantity || 0,
      status: "publish",
    }

    // ✅ Step 5: Create product in WooCommerce
    const { data } = await api.post("products", wooProductData)
    logger.info(`✅ Synced product ${product.title} to WooCommerce (ID: ${data.id})`)
  } catch (err: any) {
    logger.error("❌ Woo sync error:", err.response?.data || err.message)
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
}
