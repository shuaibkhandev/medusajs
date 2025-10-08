import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ProductModuleService } from "@medusajs/product"

export async function POST(
  request: MedusaRequest,
  response: MedusaResponse
): Promise<void> {
  const productModuleService: ProductModuleService =
    request.scope.resolve("productModuleService")

  const products = await productModuleService.createProducts([
    {
      title: "Medusa Shirt",
      options: [{ title: "Color" }],
      variants: [
        {
          title: "Black Shirt",
          options: [{ value: "Black" }],
        },
      ],
    },
  ])

  response.json({ success: true, products })
}
