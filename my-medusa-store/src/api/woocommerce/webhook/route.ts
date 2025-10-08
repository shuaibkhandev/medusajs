import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("✅ WooCommerce Webhook Called")

  try {
    // WooCommerce sends JSON body — parse safely
    const body = req.body || (await req.json?.()) || {}

    const title = body?.title || "Untitled Product"
    const description =
      body?.description ||
      "No description provided"
        const thumbnail = body?.thumbnail || null

    console.log("🛒 Woo Product Data Received:", { title, description, thumbnail })

    // Create product in Medusa
    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    const uniqueHandle = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`

    const [product] = await productModuleService.createProducts([
      {
        title,
        handle: uniqueHandle,
        description,
        thumbnail
      },
    ])

    console.log("✅ Product Created in Medusa:", product.id)

    res.json({
      success: true,
      message: "Product created successfully in Medusa",
      product,
    })
  } catch (err: any) {
    console.error("❌ Webhook Error:", err)
    res.status(500).json({ error: err.message })
  }
}
