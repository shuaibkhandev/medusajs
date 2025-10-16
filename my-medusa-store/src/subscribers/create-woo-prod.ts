// // import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
// // import { Modules } from "@medusajs/framework/utils"
// // import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"

// // export default async function productToWooSubscriber({
// //   event,
// //   container,
// // }: SubscriberArgs): Promise<void> {
// //   const logger = container.resolve("logger")
// //   const productModule = container.resolve(Modules.PRODUCT)

// //   try {
// //     // ✅ Step 1: Get product ID from event
// //     const productId = event.data.id
// //     logger.info(`Received product.created event for ${productId}`)

// //     // ✅ Step 2: Fetch full Medusa product
// //     const product = await productModule.retrieveProduct(productId, {
// //       relations: ["images", "variants", "options"],
// //     })
// //     logger.info("Full product data fetched:", product)

// //     // ✅ Step 3: Prepare WooCommerce API client
// //     const api = new WooCommerceRestApi({
// //       url: "http://localhost/medusa",
// //       consumerKey: "ck_b366a754f42111a9909b13bd61b33d343d59b708",
// //       consumerSecret: "cs_74a643b1e50d525b0612193c4db83d9076119d06",
// //       version: "wc/v3",
// //       queryStringAuth: true,
// //     })

// //     // ✅ Step 4: Map Medusa → WooCommerce product fields
// //     const wooProductData = {
// //       name: product.title,
// //       type: "simple",
// //       regular_price: product.variants?.[0]?.prices?.[0]?.amount
// //         ? String(product.variants[0].prices[0].amount / 100)
// //         : "0",
// //       description: product.description,
// //       short_description: product.subtitle,
// //       images: product.images?.map((img: any) => ({ src: img.url })) || [],
// //       sku: product.variants?.[0]?.sku || "",
// //       stock_quantity: product.variants?.[0]?.inventory_quantity || 0,
// //       status: "publish",
// //     }

// //     // ✅ Step 5: Create product in WooCommerce
// //     const { data } = await api.post("products", wooProductData)
// //     logger.info(`✅ Synced product ${product.title} to WooCommerce (ID: ${data.id})`)
// //   } catch (err: any) {
// //     logger.error("❌ Woo sync error:", err.response?.data || err.message)
// //   }
// // }

// // export const config: SubscriberConfig = {
// //   event: "product.created",
// // }


// import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
// import { Modules } from "@medusajs/framework/utils"
// import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"

// export default async function productToWooSubscriber({
//   event,
//   container,
// }: SubscriberArgs): Promise<void> {
//   const logger = container.resolve("logger")
//   const productModule = container.resolve(Modules.PRODUCT)

//   try {
//     // ✅ 1. Get product ID from event
//     const productId = event.data.id
//     logger.info(`Received product.created event for ${productId}`)

//     // ✅ 2. Fetch the full product details from Medusa
//     const product = await productModule.retrieveProduct(productId, {
//       relations: ["images", "variants", "options"],
//     })
//     logger.info("Full product data fetched:", product)

//     // ✅ 3. Setup WooCommerce API client
//     const api = new WooCommerceRestApi({
//       url: "http://localhost/medusa", // change this to your Woo URL
//       consumerKey: "ck_b366a754f42111a9909b13bd61b33d343d59b708",
//       consumerSecret: "cs_74a643b1e50d525b0612193c4db83d9076119d06",
//       version: "wc/v3",
//       queryStringAuth: true,
//     })

//     // ✅ 4. Map Medusa → WooCommerce fields
//     const wooProductData = {
//       name: product.title,
//       type: "simple",
//       regular_price: product.variants?.[0]?.prices?.[0]?.amount
//         ? String(product.variants[0].prices[0].amount / 100)
//         : "0",
//       description: product.description,
//       short_description: product.subtitle || "",
//       images: product.images?.map((img: any) => ({ src: img.url })) || [],
//       sku: product.variants?.[0]?.sku || "",
//       stock_quantity: product.variants?.[0]?.inventory_quantity || 0,
//       status: "publish",

//       // ✅ Add Medusa product ID to Woo metadata for tracking
//       meta_data: [
//         {
//           key: "medusa_product_id",
//           value: product.id,
//         },
//       ],
//     }

//     // ✅ 5. Create the product in WooCommerce
//     const { data } = await api.post("products", wooProductData)

//     logger.info(`✅ Synced product "${product.title}" to WooCommerce (Woo ID: ${data.id})`)
//   } catch (err: any) {
//     logger.error("❌ Woo sync error:", err.response?.data || err.message)
//   }
// }

// // ✅ Subscriber Config
// export const config: SubscriberConfig = {
//   event: "product.created",
// }

import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"
import axios from "axios"

export default async function productToWooSubscriber({
  event,
  container,
}: SubscriberArgs): Promise<void> {
  const logger = container.resolve("logger")
  const productModule = container.resolve(Modules.PRODUCT)

  try {
    // ✅ 1. Get product ID from event
    const productId = event.data.id
    logger.info(`Received product.created event for ${productId}`)

    // ✅ 2. Fetch product details from Medusa
    const product = await productModule.retrieveProduct(productId, {
      relations: ["images", "variants", "options"],
    })
    logger.info("Full product data fetched:", product.title)

    // ✅ 3. WooCommerce API setup
    const api = new WooCommerceRestApi({
      url: "http://localhost/medusa", // Your WooCommerce base URL
      consumerKey: "ck_b366a754f42111a9909b13bd61b33d343d59b708",
      consumerSecret: "cs_74a643b1e50d525b0612193c4db83d9076119d06",
      version: "wc/v3",
      queryStringAuth: true,
    })

    // ✅ 4. Map Medusa → Woo fields
    const wooProductData = {
      name: product.title,
      type: "simple",
      regular_price: product.variants?.[0]?.prices?.[0]?.amount
        ? String(product.variants[0].prices[0].amount / 100)
        : "0",
      description: product.description,
      short_description: product.subtitle || "",
      images: product.images?.map((img: any) => ({ src: img.url })) || [],
      sku: product.variants?.[0]?.sku || "",
      stock_quantity: product.variants?.[0]?.inventory_quantity || 0,
      status: "publish",
      meta_data: [
        {
          key: "medusa_product_id",
          value: product.id,
        },
      ],
    }

    // ✅ 5. Create product in WooCommerce
    const { data: wooProduct } = await api.post("products", wooProductData)
    logger.info(`✅ Synced "${product.title}" to WooCommerce (Woo ID: ${wooProduct.id})`)

    // ✅ 6. Save WooCommerce ID into Medusa metadata
    // You can use Medusa Admin API here to patch the product
    const adminUrl = "http://localhost:9000/admin/products/" + productId

    // ⚠️ Use your real admin credentials here
    const adminAuth = {
      email: "admin@medusajs.com",
      password: "supersecret",
    }

    // Get token
    const loginRes = await axios.post("http://localhost:9000/auth/user/emailpass", adminAuth)
    const token = loginRes.data.token

    // Update product metadata
    await axios.post(
      adminUrl,
      {
        metadata: {
          ...(product.metadata || {}),
          woo_product_id: wooProduct.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )

    logger.info(`🔗 Saved WooCommerce ID (${wooProduct.id}) to Medusa product metadata`)
  } catch (err: any) {
    logger.error("❌ Woo sync error:", err.response?.data || err.message)
  }
}

// ✅ Subscriber Config
export const config: SubscriberConfig = {
  event: "product.created",
}
