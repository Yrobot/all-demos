import { markdownToBlocks } from "@tryfabric/martian";
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

const token = "secret_PhoA3XY663F5uVdHZ6aYhv2rsjwuxhFFCFVSBBDSgqM";

const workspace_id = "c2a78f13-327d-430a-99c6-7242b579d51b"; // get from /v1/oauth/token response

const rootPageId = "1075f008-6046-8077-abfe-e1087e556154";
const rootDBId = "10a5f008-6046-819f-8856-dcf873f078af";
// function

const notionFetch = async (
  url: string,
  {
    auth = `Bearer ${token}`,
    body,
    method = !!body ? "POST" : "GET",
  }: {
    auth?: string;
    method?: string;
    body?: any;
  }
) =>
  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.object === "error") {
        console.warn("Notion Fetch Error:\n", res, {
          url: `[${method}] ${url}`,
          token,
          body,
        });
        throw new Error(res.message);
      }
      return res;
    });

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

async function getPage(title: string) {
  try {
    const response = await fetch(`https://api.notion.com/v1/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        query: title,
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

    const result = data.results[0];
    console.log(result);

    return result;
  } catch (error) {
    console.error("Error getPage:", error);
  }
}

async function listDatabases() {
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
          value: "database",
          property: "object",
        },
      }),
    });
    const data = await response.json();

    if (data.object === "error") {
      console.warn(data);
      throw new Error(data.message);
    }
    console.log("Databases:", data);

    return data.results;
  } catch (error) {
    console.error("Error listing databases:", error);
  }
}

async function createNewPage({
  title,
  content,
  parent = { database_id: rootDBId },
}: {
  title: string;
  content: string;
  parent?: { database_id: string } | { page_id: string };
}) {
  const notionApiUrl = "https://api.notion.com/v1/pages";
  const response = await fetch(notionApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent, // 父级数据库ID
      properties: {
        title: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: content } }],
          },
        },
      ],
    }),
  });

  const data = await response.json();
  if (data.object === "error") {
    console.warn(data);
    throw new Error(data.message);
  }
  console.log(data);
  return data;
}

async function appendMarkdownToPage(pageId: string, markdown: string) {
  try {
    const blocks = markdownToBlocks(markdown);
    const response = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          children: blocks,
        }),
      }
    );
    const data = await response.json();

    if (data.object === "error") {
      console.warn(data);
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error("Error listing databases:", error);
  }
}

async function createDB() {
  const res = await notionFetch("https://api.notion.com/v1/databases", {
    body: {
      parent: {
        page_id: rootPageId,
      },
      title: [
        {
          type: "text",
          text: {
            content: "Brainglue DB",
          },
        },
      ],
      properties: {
        Conversation: {
          title: {},
        },
      },
    },
  });
  console.log(res);
  return res;
}

const md = `
# Title
> subtitle

Current Time: ${new Date().toISOString()}

this is the content.

- li1
- li2
- li3

1. lo1
2. lo2
3. lo3
`;

const appendDemo = async () => {
  const braingluePage = await getPage("Brainglue");
  if (!braingluePage) {
    console.warn(`Can't find page Brainglue.`);
    return;
  }
  const pageId = braingluePage.id;
  console.log(await appendMarkdownToPage(pageId, md));
};

(async () => {
  for (let i = 0; i < 4; i++) {
    await createNewPage({
      title: `Conversation ${i}`,
      content: `AI response content.`,
      parent: {
        page_id: rootPageId,
      },
    });
  }
})().catch(console.error);
