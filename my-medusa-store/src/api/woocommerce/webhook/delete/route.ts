import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("🗑️ WooCommerce Product Delete Webhook Called")

  try {
    // 🧩 Parse JSON body safely
    const body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : await req.json()

    console.log("📦 Woo Delete Payload:", body);

    const wooId = body?.id
    if (!wooId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing WooCommerce product ID" })
    }

    // 🧠 Resolve Medusa Product module
    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // ✅ Fetch all products
    const allProducts = await productModuleService.listProducts({}, { take: 1000 })

    // ✅ Find those with matching WooCommerce ID in metadata
const matchedProducts = allProducts.filter(
  (p) => p.metadata?.woo_product_id?.toString() === wooId.toString()
)

    if (matchedProducts.length === 0) {
      console.warn(`⚠️ No Medusa product found with Woo ID: ${wooId}`)
      return res.status(404).json({
        success: false,
        message: `No product found in Medusa with Woo ID: ${wooId}`,
      })
    }

    // ✅ Delete all matched products
    for (const product of matchedProducts) {
      await productModuleService.deleteProducts([product.id])
      console.log(`🗑️ Deleted Medusa Product: ${product.title} (${product.id})`)
    }

    return res.status(200).json({
      success: true,
      message: `✅ Deleted ${matchedProducts.length} product(s) with Woo ID: ${wooId}`,
    })
  } catch (err: any) {
    console.error("❌ Webhook Error (delete):", err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
