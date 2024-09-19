import {
  NOTION_OAUTH_CLIENT_ID,
  NOTION_OAUTH_CLIENT_SECRET,
  REDIRECT_URL,
} from "../src/env";
// VAR
const CODE = "0031493aa-aeae-41b3-9ba0-de86ea96c3b7";

const clientId = NOTION_OAUTH_CLIENT_ID;
const clientSecret = NOTION_OAUTH_CLIENT_SECRET;
const redirectUri = REDIRECT_URL;

const token = "secret_8BeeGLkNYssp61Gj47iL74DyxYp5Rx2S2q488jS4Fpx";

// function

const codeToToken = async () => {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: CODE,
      redirect_uri: redirectUri,
    }),
  }).then((res) => res.json());
  console.log(response);
};

// 获取页面列表的函数
async function listPages() {
  // 初始化 Notion API 请求参数
  const notionApiUrl = "https://api.notion.com/v1/search";
  try {
    const response = await fetch(notionApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          property: "object",
          value: "page",
        },
      }),
    });

    const data = await response.json();

    if (data.object === "error") {
      console.warn(data);
      throw new Error(data.message);
    }

    // 打印页面信息
    data.results.forEach((page: any) => {
      console.log(
        `Page ID: ${page.id}, Page Title: ${page.properties.title.title[0].plain_text}`
      );
    });
  } catch (error) {
    console.error("Error listing pages:", error);
  }
}

(async () => {
  await listPages();
})().catch(console.error);
