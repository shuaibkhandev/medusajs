import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // Step 1: Create product
    const uniqueHandle = `t-shirt-${Date.now()}`
    const [product] = await productModuleService.createProducts([
      {
        title: "MEN T-Shirt",
        handle: uniqueHandle,
        description: "Soft cotton T-shirt",
        // options: [
        //   { title: "Color" },
        //   { title: "Size" },
        // ],
      },
    ])

    // Step 2: Get the created option IDs
    // const colorOption = product.options.find((o: any) => o.title === "Color")
    // const sizeOption = product.options.find((o: any) => o.title === "Size")

    // if (!colorOption || !sizeOption) {
    //   throw new Error("Missing product options (Color or Size)")
    // }

    // Step 3: Create variant with correct option structure
    // const variants = await productModuleService.createProductVariants([
    //   {
    //     product_id: product.id,
    //     title: "Black / M",
    
    //     prices: [
    //       {
    //         amount: 1999,
    //         currency_code: "usd",
    //       },
    //     ],
    //   },
    // ])

    res.json({
      message: "✅ Product and variant created successfully",
      product,
      // variants,
    })
  } catch (err: any) {
    console.error("❌ Error creating product:", err)
    res.status(500).json({ error: err.message })
  }
}
