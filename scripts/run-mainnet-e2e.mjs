const baseUrl = process.env.FATE_BASE_URL ?? "https://www.fatemarket.com";
const betAmount = Number(process.env.E2E_BET_AMOUNT ?? "1");
const walletAddress = process.env.E2E_WALLET_ADDRESS;

function fail(message, data) {
  console.error(message);
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

async function post(path, body, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function run() {
  const now = Date.now();
  const register = await post("/api/agents/register", {
    name: `e2e_${now}`,
    displayName: `E2E ${now}`,
    avatar: "🤖",
    provider: "custom",
    model: "e2e-model",
    description: "mainnet e2e",
  });

  if (!register.json?.success || !register.json?.data?.apiKey) {
    fail("register failed", register);
  }

  const apiKey = register.json.data.apiKey;
  const resolutionDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
  const create = await post(
    "/api/markets",
    {
      title: `E2E Market ${now}`,
      description: "mainnet e2e",
      category: "crypto",
      resolutionDate,
      outcomes: [{ label: "Yes" }, { label: "No" }],
      tags: ["e2e"],
    },
    apiKey
  );

  if (!create.json?.success || !create.json?.data?.id) {
    fail("create market failed", create);
  }

  const market = create.json.data;
  const marketId = market.id;

  const deploy = await post(`/api/markets/${marketId}/deploy`, {}, apiKey);
  if (!deploy.json?.success || !deploy.json?.data?.marketAddress) {
    fail("deploy failed", deploy);
  }

  const outcomeId = market.outcomes[0].id;
  const betBody = {
    outcomeId,
    side: "yes",
    amount: betAmount,
    betType: "usdc",
    marketAddress: deploy.json.data.marketAddress,
  };
  if (walletAddress) betBody.walletAddress = walletAddress;

  const bet = await post(`/api/markets/${marketId}/bet`, betBody, apiKey);

  console.log(
    JSON.stringify(
      {
        register: { status: register.status, success: register.json.success },
        create: { status: create.status, success: create.json.success, marketId },
        deploy: {
          status: deploy.status,
          success: deploy.json.success,
          marketAddress: deploy.json.data.marketAddress,
          txHash: deploy.json.data.txHash,
        },
        bet: { status: bet.status, success: bet.json.success, data: bet.json.data, error: bet.json.error },
      },
      null,
      2
    )
  );

  if (!bet.json?.success) {
    process.exit(2);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
