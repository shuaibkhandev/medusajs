import axios from "axios"

const WOO_URL =
  "http://localhost/medusa/wp-json/wc/v3/products?consumer_key=ck_b366a754f42111a9909b13bd61b33d343d59b708&consumer_secret=cs_74a643b1e50d525b0612193c4db83d9076119d06"

async function getWooProducts() {
  try {
    const { data } = await axios.get(WOO_URL)
    console.log(`✅ Found ${data.length} WooCommerce products`)
    console.log(data) // full product list
  } catch (err: any) {
    console.error("❌ Error fetching WooCommerce products:", err.response?.data || err.message)
  }
}

getWooProducts()
