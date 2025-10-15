import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT)

    const [product] = await productModule.createProducts([
      {
        title: "Created from inside Medusa",
        description: "No need for token here!",
        handle: "internal-product-" + Date.now(),
        status: "published",
        variants: [
          {
            title: "Default Variant",
            prices: [{ amount: 1000, currency_code: "usd" }],
          },
        ],
      },
    ])

    res.json({
      success: true,
      product,
    })
  } catch (err) {
    console.error("❌ Error:", err)
    res.status(500).json({ error: err.message })
  }
}
