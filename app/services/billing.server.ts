export async function createOneTimeCharge(
  admin: any,
  name: string,
  priceInCents: number,
  returnUrl: string,
) {
  const response = await admin.graphql(
    `#graphql
    mutation appPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!) {
      appPurchaseOneTimeCreate(name: $name, price: $price, returnUrl: $returnUrl) {
        userErrors {
          field
          message
        }
        appPurchaseOneTime {
          id
          status
        }
        confirmationUrl
      }
    }`,
    {
      variables: {
        name,
        price: {
          amount: (priceInCents / 100).toFixed(2),
          currencyCode: "USD",
        },
        returnUrl,
      },
    },
  );

  const data = await response.json();
  const result = data.data?.appPurchaseOneTimeCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((e: any) => e.message).join(", "));
  }

  return {
    chargeId: result?.appPurchaseOneTime?.id,
    confirmationUrl: result?.confirmationUrl,
    status: result?.appPurchaseOneTime?.status,
  };
}

export async function getOneTimeCharge(admin: any, chargeId: string) {
  const response = await admin.graphql(
    `#graphql
    query appPurchaseOneTime($id: ID!) {
      node(id: $id) {
        ... on AppPurchaseOneTime {
          id
          status
          name
          price { amount currencyCode }
          createdAt
        }
      }
    }`,
    { variables: { id: chargeId } },
  );

  const data = await response.json();
  return data.data?.node;
}
