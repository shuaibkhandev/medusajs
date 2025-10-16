import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("♻️ WooCommerce Product Update Webhook Called")

  try {
    const body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : await req.json()

    console.log("🛒 Woo Update Payload:", body)

    const wooId = body?.id
    if (!wooId)
      return res.status(400).json({
        success: false,
        message: "❌ Missing WooCommerce product ID",
      })

    const title = body?.name || "Untitled Product"
    const description = body?.description || "No description provided"
    const thumbnail = body?.images?.[0]?.src || null

    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // 1️⃣ Fetch all Medusa products
    const allProducts = await productModuleService.listProducts({}, { select: ["id", "title", "metadata"] })

    // 2️⃣ Find the product linked to this Woo ID
    const foundProduct = allProducts.find((p: any) => {
      const wooMeta = p.metadata?.woo_id?.toString() === wooId.toString()
      const medusaMeta = body?.meta_data?.some(
        (meta: any) =>
          meta.key === "medusa_product_id" && meta.value === p.id
      )
      return wooMeta || medusaMeta
    })

    if (!foundProduct) {
      console.warn(`⚠️ No Medusa product found for Woo ID: ${wooId}`)
      return res.status(200).json({
        success: false,
        message: `No Medusa product found for Woo ID: ${wooId}`,
      })
    }

    console.log(`✅ Found Medusa product: ${foundProduct.title} (${foundProduct.id})`)

    // 3️⃣ Build update payload
    const updatePayload = {
      title,
      description,
      thumbnail,
      metadata: {
        ...(foundProduct.metadata || {}),
        woo_id: wooId,
      },
    }

    console.log("🧾 Update payload to Medusa:", JSON.stringify(updatePayload, null, 2))

    // 4️⃣ Call latest v2 method
    const updatedProduct = await productModuleService.updateProducts(foundProduct.id, updatePayload)

    console.log("✅ Product Updated:", updatedProduct.id)

    return res.status(200).json({
      success: true,
      message: `✅ Product "${updatedProduct.title}" updated successfully`,
      product: updatedProduct,
    })
  } catch (err: any) {
    console.error("❌ Webhook Error (update):", err)
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    })
  }
}
