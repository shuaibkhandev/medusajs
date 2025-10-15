export default async function main() {
  const fetch = (await import("node-fetch")).default;
  console.log(":closed_lock_with_key: Attempting to authenticate with Medusa admin...");

  const loginRes = await fetch("http://localhost:9000/auth/user/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "newadmin@medusajs.com",
      password: "newsecret",
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error(":x: Login failed:", loginData);
    return;
  }

  const token = loginData.token;
  console.log(":white_check_mark: Logged in successfully. Token received.");
  console.log("Token:", token.substring(0, 20) + "...");

  const createRes = await fetch("http://localhost:9000/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Cloths",
      description: "Created inside Medusa using admin token",
      status: "published",
      options: [
        {
          title: "Size",
          values: ["M"],
        },
      ],
      variants: [
        {
          title: "Default Variant",
          options: { Size: "M" },
          prices: [
            {
              amount: 2000,
              currency_code: "usd",
            },
          ],

        },
      ],
    }),
  });

  const productData = await createRes.json();
  if (!createRes.ok) {
    console.error(":x: Failed to create product:", productData);
  } else {
    console.log(":white_check_mark: Product created successfully:", productData.product || productData);
  }
}
