import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"
import axios from "axios"

interface WooProduct {
  id: number
  name: string
  sku: string
  price: string
  description?: string
  images?: { src: string }[]
  meta_data?: { key: string; value: string }[]
}

interface MedusaVariant {
  id: string
  title: string
  sku: string
  prices?: { amount: number; currency_code: string }[]
}

interface MedusaProduct {
  id: string
  title: string
  description?: string
  thumbnail?: string
  variants?: MedusaVariant[]
  metadata?: Record<string, any>
}

export default async function main() {
  // ✅ WooCommerce setup
  const wooApi = new WooCommerceRestApi({
    url: "http://localhost/medusa",
    consumerKey: "ck_b366a754f42111a9909b13bd61b33d343d59b708",
    consumerSecret: "cs_74a643b1e50d525b0612193c4db83d9076119d06",
    version: "wc/v3",
    queryStringAuth: true,
  })

  try {
    // ✅ Fetch all WooCommerce products
    const { data: wooProducts }: { data: WooProduct[] } = await wooApi.get("products", { per_page: 100 })
    console.log(`🛍️ Found ${wooProducts.length} products in WooCommerce.`)

    // ✅ Fetch all Medusa products
    const { data: medusaData } = await axios.get("http://localhost:9000/store/products", {
      headers: {
        "x-publishable-api-key": "pk_5c58671b14eecbdcd421628851d57823557ee5d4109f5239d8a31ab672212d31",
      },
    })
    const medusaProducts: MedusaProduct[] = medusaData.products || medusaData
    console.log(`📦 Found ${medusaProducts.length} products in Medusa.`)

    // ✅ Login once to Medusa as Admin
    const loginRes = await axios.post("http://localhost:9000/auth/user/emailpass", {
      email: "admin@medusajs.com",
      password: "supersecret",
    })
    const adminToken = loginRes.data.token
    console.log(`✅ Logged into Medusa as admin.`)

    // ✅ Build SKU lists
    const wooSKUs = wooProducts.map(p => p.sku).filter(Boolean)
    const medusaSKUs = medusaProducts.flatMap(p => p.variants?.map(v => v.sku) || []).filter(Boolean)

    // ======================================================
    // 🔁 1️⃣ SYNC: MEDUSA → WOO
    // ======================================================
    const onlyInMedusa = medusaProducts.filter(p => !p.variants?.some(v => wooSKUs.includes(v.sku)))
    console.log(`\n🔵 Found ${onlyInMedusa.length} products only in Medusa.`)

    for (const product of onlyInMedusa) {
      const variant = product.variants?.[0]
      const price = variant?.prices?.[0]?.amount ? (variant.prices[0].amount / 100).toString() : "0"

      try {
        // ✅ Create product in WooCommerce
        const wooProductData = {
          name: product.title,
          sku: variant?.sku || `medusa-${product.id}`,
          regular_price: price,
          description: product.description || "",
          images: product.thumbnail ? [{ src: product.thumbnail }] : [],
          meta_data: [{ key: "medusa_product_id", value: product.id }],
        }

        const { data: createdWoo } = await wooApi.post("products", wooProductData)
        console.log(`✅ Created in Woo: ${createdWoo.name} (SKU: ${createdWoo.sku})`)

        // ✅ Immediately update Medusa product metadata with Woo ID
        await axios.post(
          `http://localhost:9000/admin/products/${product.id}`,
          {
            metadata: {
              ...(product.metadata || {}),
              woo_product_id: createdWoo.id,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              "Content-Type": "application/json",
            },
          }
        )

        console.log(`🔗 Linked Woo ID ${createdWoo.id} → Medusa ${product.id}`)
      } catch (err: any) {
        console.error(`❌ Failed Medusa→Woo sync: ${product.title}`)
        console.error(err.response?.data || err.message)
      }
    }

    // ======================================================
    // 🔁 2️⃣ SYNC: WOO → MEDUSA
    // ======================================================
    const onlyInWoo = wooProducts.filter(p => !medusaSKUs.includes(p.sku))
    console.log(`\n🟣 Found ${onlyInWoo.length} products only in WooCommerce.`)

    for (const wooProduct of onlyInWoo) {
      try {
        const payload = {
          title: wooProduct.name,
          description: wooProduct.description || "No description provided",
          status: "published",
          thumbnail: wooProduct.images?.[0]?.src || null,
          options: [{ title: "Default Title", values: ["Default Value"] }],
          variants: [
            {
              title: "Default Variant",
              sku: wooProduct.sku || `woo-${wooProduct.id}`,
              prices: [
                {
                  amount: wooProduct.price ? parseFloat(wooProduct.price) * 100 : 1000,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [{ id: "sc_01K6W96CNQ5TC06Q83Q8TWSWYS" }],
          metadata: { woo_product_id: wooProduct.id },
        }

        const { data: created } = await axios.post("http://localhost:9000/admin/products", payload, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        })

        console.log(`✅ Created in Medusa: ${created.product?.title || wooProduct.name}`)

        // ✅ Add Medusa ID back into Woo metadata
        await wooApi.put(`products/${wooProduct.id}`, {
          meta_data: [
            ...(wooProduct.meta_data || []),
            { key: "medusa_product_id", value: created.product?.id },
          ],
        })

        console.log(`🔗 Linked Medusa ID ${created.product?.id} → Woo ${wooProduct.id}`)
      } catch (err: any) {
        console.error(`❌ Failed Woo→Medusa sync: ${wooProduct.name}`)
        console.error(err.response?.data || err.message)
      }
    }

    console.log("\n🎉 Two-way sync complete with cross-linking!")
  } catch (err: any) {
    console.error("❌ Error during sync:")
    console.error(err.response?.data || err.message)
  }
}
