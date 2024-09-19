"use server";
import {
  NOTION_OAUTH_CLIENT_ID,
  NOTION_OAUTH_CLIENT_SECRET,
  REDIRECT_URL,
} from "@/env";

const notionFetch = async (
  url: string,
  {
    token,
    method = "GET",
    body,
  }: {
    token: string;
    method?: string;
    body?: any;
  }
) =>
  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
      Authorization: token,
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

/* Response
{
  access_token: "secret_PhTEPhXfuEtm2gvDtRRwlxF3eFYMgXHQHvFPIJrlF51",
  token_type: "bearer",
  bot_id: "105d872b-594c-81b0-814c-0027518c6eb0",
  workspace_name: "Yrobot's Notion",
  workspace_icon: "https://s3-us-west-2.amazonaws.com/public.notion-static.com/c02824fe-83ec-4d6e-9451-0ccc01e9c49e/Avatar.jpg",
  workspace_id: "c2a78f13-327d-430a-99c6-7242b579d51b",
  owner: {
    type: "user",
    user: {
      object: "user",
      id: "82c961dc-44a8-4886-98e8-c5bc05aa1506",
      name: "Yrobot",
      avatar_url: "https://s3-us-west-2.amazonaws.com/public.notion-static.com/c02824fe-83ec-4d6e-9451-0ccc01e9c49e/Avatar.jpg",
      type: "person",
      person: [Object ...],
    },
  },
  duplicated_template_id: null,
  request_id: "90c2bb40-d08c-4d1b-adfc-443d1ee80bfd",
} 
*/

export const codeToToken = async (code: string) => {
  const encoded = Buffer.from(
    `${NOTION_OAUTH_CLIENT_ID}:${NOTION_OAUTH_CLIENT_SECRET}`
  ).toString("base64");
  const response = await notionFetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    token: `Basic ${encoded}`,
    body: {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URL,
    },
  });
  console.log(response);
  return response?.access_token;
};

type Page = {
  id: string;
  title: string;
};

export const getAllPages = async ({
  token,
  search = "",
}: {
  token: string;
  search?: string;
}) => {
  const response = await notionFetch("https://api.notion.com/v1/search", {
    method: "POST",
    token: `Bearer ${token}`,
    body: {
      query: search,
      filter: {
        property: "object",
        value: "page",
      },
    },
  });
  console.log(response);
  const pages: Page[] = (response?.results ?? []).map((result: any) => ({
    id: result?.id,
    title: result?.properties?.title?.title?.[0]?.plain_text,
  }));
  console.log(pages);
  return pages;
};
